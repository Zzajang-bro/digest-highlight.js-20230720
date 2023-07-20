/*
############################################################
[처리중]

이스케이프...를 하기 전에 문서를 읽어야 함
https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Regular_expressions
슬래시로 감싼 문자열은 정규표현식리터럴이라 함
.replace(/xxxxxx/g, '\\$&') 여기서
    * g는 전체 문자열을 탐색해서 모든 일치를 반환하도록 지정하는 전역 탐색 플래그
    * $&는 일치한 문자열 전체임
    * m 플래그는 여러줄에 걸친 문자열을 여러줄로 취급하게 함
      : ^를 쓰면 각 줄의 시작으로 인식, $는 그 줄의 끝
    * []는 이 안에 포함된 문자 가운데 하나랑 매치
      https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences
따라서 => \x 에서 \가 하나면 문제가 생김 => \\로 바꿔줘야함 => x를 찾으면 \x로 바꿔줌
이게 정규식용 문자열을 생성하는 과정임
정규식 객체(이스케이프처리문자열, 'm')를 만들어서 반환함


소스
re를 인자로 받음. 근데 re가 re가 아님
받은 re가 뭔가 문제가 있으면(!re) null
스트링이면 그대로 리턴
아니면 re.source를 리턴함 => 정규식에서 원본 문자열 뽑아내는 듯


정규 표현식 앞뒤로 뭔가 붙이는 함수들
문자열을 받아서 뭔가를 붙임. 아마 정규표현식의 특성(?) 정하는 듯
* 룩어헤드 (?=정규)
* 애니 넘버 오브 타임즈: (?:정규)*
* 옵셔널: (?:정규)?
여기서 RE는 문자열인 듯


콘캣
가변인자를 받아서 소스(정규식 오브젝트 말고 문자열)로 매핑하고 모두 붙여서 반환


아규먼트에서 옵션 떼기
배열을 받아서 마지막 원소가 옵션
옵션의 타입이 'object'고 옵션의 생성자가 오브젝트이면(?)
인자 마지막 원소 스플라이스해서 반환
아니면 빈 오브젝트 반환

보기 귀찮아서 나머지 내용은 아래로 내림

############################################################
*/


/**
 * @param {string} value
 * @returns {RegExp}
 * */
export function escape(value) {
  return new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
export function source(re) {
  if (!re) return null;
  if (typeof re === "string") return re;

  return re.source;
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
export function lookahead(re) {
  return concat('(?=', re, ')');
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
export function anyNumberOfTimes(re) {
  return concat('(?:', re, ')*');
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
export function optional(re) {
  return concat('(?:', re, ')?');
}

/**
 * @param {...(RegExp | string) } args
 * @returns {string}
 */
export function concat(...args) {
  const joined = args.map((x) => source(x)).join("");
  return joined;
}

/**
 * @param { Array<string | RegExp | Object> } args
 * @returns {object}
 */
function stripOptionsFromArgs(args) {
  const opts = args[args.length - 1];

  if (typeof opts === 'object' && opts.constructor === Object) {
    args.splice(args.length - 1, 1);
    return opts;
  } else {
    return {};
  }
}

/** @typedef { {capture?: boolean} } RegexEitherOptions */




/*
#################################################################

이더
가변인자를 스트립 옵션
가변인자의 소스를 구해서 | 로 조인 = 임시1
포맷스트링을 만드는데 ( ?: 임시1 )


#################################################################
*/





/**
 * Any of the passed expresssions may match
 *
 * Creates a huge this | this | that | that match
 * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
 * @returns {string}
 */
export function either(...args) {
  /** @type { object & {capture?: boolean} }  */
  const opts = stripOptionsFromArgs(args);
  const joined = '('
    + (opts.capture ? "" : "?:")
    + args.map((x) => source(x)).join("|") + ")";
  return joined;
}

/**
 * @param {RegExp | string} re
 * @returns {number}
 */
export function countMatchGroups(re) {
  return (new RegExp(re.toString() + '|')).exec('').length - 1;
}

/**
 * Does lexeme start with a regular expression match at the beginning
 * @param {RegExp} re
 * @param {string} lexeme
 */
export function startsWith(re, lexeme) {
  const match = re && re.exec(lexeme);
  return match && match.index === 0;
}

// BACKREF_RE matches an open parenthesis or backreference. To avoid
// an incorrect parse, it additionally matches the following:
// - [...] elements, where the meaning of parentheses and escapes change
// - other escape sequences, so we do not misparse escape sequences as
//   interesting elements
// - non-matching or lookahead parentheses, which do not capture. These
//   follow the '(' with a '?'.
const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

// **INTERNAL** Not intended for outside usage
// join logically computes regexps.join(separator), but fixes the
// backreferences so they continue to match.
// it also places each individual regular expression into it's own
// match group, keeping track of the sequencing of those match groups
// is currently an exercise for the caller. :-)
/**
 * @param {(string | RegExp)[]} regexps
 * @param {{joinWith: string}} opts
 * @returns {string}
 */
export function _rewriteBackreferences(regexps, { joinWith }) {
  let numCaptures = 0;

  return regexps.map((regex) => {
    numCaptures += 1;
    const offset = numCaptures;
    let re = source(regex);
    let out = '';

    while (re.length > 0) {
      const match = BACKREF_RE.exec(re);
      if (!match) {
        out += re;
        break;
      }
      out += re.substring(0, match.index);
      re = re.substring(match.index + match[0].length);
      if (match[0][0] === '\\' && match[1]) {
        // Adjust the backreference.
        out += '\\' + String(Number(match[1]) + offset);
      } else {
        out += match[0];
        if (match[0] === '(') {
          numCaptures++;
        }
      }
    }
    return out;
  }).map(re => `(${re})`).join(joinWith);
}
