/*
#######################################
[ 처리중 ]

COMMON_KEYWORDS: 기본 관련 값이 없는 키워드라는데, 변수명도 그렇고 아마 언어 공통인게 아닐까
object.create(null) - 오브젝트 관련 프로토타입이 아예 없는 오브젝트를 만든다
ㄴ 기능상으로는 이게 let o = {}여야 할 것 같은데 데이터 엔트로피 때문에 이렇게 정한건가


compileKeywords - 타입에 따라 compileList로 던져주는 함수
스트링인 경우: ' '로 스플릿 해서 리스트 던져줌
배열인 경우: 그냥 던져줌
오브젝트인 경우 처리한 뒤에 compil**ED**Keywords 오브젝트에 넣어줌
ㄴ자기 자신(컴파일키워드)를 호출하는데 컴파일리스트랑 아규먼트 순서가 다름
ㄴ처리는 오브젝트 밸류 별로 자신을 호출해서 컴파일**드**키워드에 키랑 묶어서 넣어줌

컴파일 리스트는 함수 안에 있는 함수
케이스센서티브 하지 않으면 소문자로 바꿈
키워드 리스트를 순회하면서 '|'로 스플릿, 페어(이름, 데이터)를 만듬
컴파일드키워드[이름], [스코프, 스코어함수(?)]를 저장함


스코어 함수:
만약 스코어가 주어진다면(프로바이디드 스코어)
스코어(문자열)을 숫자로 바꿔서 반환
아니면
커먼키워드면 0 아니면 1



커먼 키워드:
로워케이스로 낮춰서 커먼 키워드 배열에 포함되어있는지 확인


근데 익스포트는 컴파일키워드 함수 하나밖에 없음
#######################################
*/



// keywords that should have no default relevance value
const COMMON_KEYWORDS = [
  'of',
  'and',
  'for',
  'in',
  'not',
  'or',
  'if',
  'then',
  'parent', // common variable name
  'list', // common variable name
  'value' // common variable name
];

const DEFAULT_KEYWORD_SCOPE = "keyword";

/**
 * Given raw keywords from a language definition, compile them.
 *
 * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
 * @param {boolean} caseInsensitive
 */
export function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
  /** @type {import("highlight.js/private").KeywordDict} */
  const compiledKeywords = Object.create(null);

  // input can be a string of keywords, an array of keywords, or a object with
  // named keys representing scopeName (which can then point to a string or array)
  if (typeof rawKeywords === 'string') {
    compileList(scopeName, rawKeywords.split(" "));
  } else if (Array.isArray(rawKeywords)) {
    compileList(scopeName, rawKeywords);
  } else {
    Object.keys(rawKeywords).forEach(function(scopeName) {
      // collapse all our objects back into the parent object
      Object.assign(
        compiledKeywords,
        compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
      );
    });
  }
  return compiledKeywords;

  // ---

  /**
   * Compiles an individual list of keywords
   *
   * Ex: "for if when while|5"
   *
   * @param {string} scopeName
   * @param {Array<string>} keywordList
   */
  function compileList(scopeName, keywordList) {
    if (caseInsensitive) {
      keywordList = keywordList.map(x => x.toLowerCase());
    }
    keywordList.forEach(function(keyword) {
      const pair = keyword.split('|');
      compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
    });
  }
}

/**
 * Returns the proper score for a given keyword
 *
 * Also takes into account comment keywords, which will be scored 0 UNLESS
 * another score has been manually assigned.
 * @param {string} keyword
 * @param {string} [providedScore]
 */
function scoreForKeyword(keyword, providedScore) {
  // manual scores always win over common keywords
  // so you can force a score of 1 if you really insist
  if (providedScore) {
    return Number(providedScore);
  }

  return commonKeyword(keyword) ? 0 : 1;
}

/**
 * Determines if a given keyword is common or not
 *
 * @param {string} keyword */
function commonKeyword(keyword) {
  return COMMON_KEYWORDS.includes(keyword.toLowerCase());
}
