import ArticleMenu from '../core/ArticleMenu';
import { addOnModifyArticle, addOnModifyComment } from '../core/AREventHandler';
import { addSetting, getValue, setValue } from '../core/Configure';
import { CurrentPage, parseUserInfo } from '../core/Parser';

import MuteStyle, { stylesheet } from '../css/MuteContent.module.css';

export default { load };

const BLOCK_USER = { key: 'blockUser', defaultValue: [] };
const BLOCK_KEYWORD = { key: 'blockKeyword', defaultValue: [] };
const MUTE_CATEGORY = { key: 'muteCategory', defaultValue: {} };
const MUTE_NOTICE = { key: 'hideNotice', defaultValue: false };

function load() {
  try {
    setupSetting();

    if (CurrentPage.Component.Article) {
      addArticleMenu();
    }
    if (CurrentPage.Component.Comment) {
      muteContent('comment');
    }
    if (CurrentPage.Component.Board) {
      muteNotice();
      mutePreview();
      muteContent('board');
    }

    addOnModifyArticle({
      priority: 100,
      callback() {
        muteNotice();
        mutePreview();
        muteContent('board');
      },
    });
    addOnModifyComment({
      priority: 100,
      callback() {
        muteContent('comment');
      },
    });
  } catch (error) {
    console.error(error);
  }
}

function setupSetting() {
  document.head.append(<style>{stylesheet}</style>);

  const hideNotice = (
    <select>
      <option value="false">사용 안 함</option>
      <option value="true">사용</option>
    </select>
  );
  const userMute = (
    <textarea rows="6" placeholder="뮤트할 이용자의 닉네임을 입력, 줄바꿈으로 구별합니다." />
  );
  const keywordMute = (
    <textarea rows="6" placeholder="뮤트할 키워드를 입력, 줄바꿈으로 구별합니다." />
  );
  const categoryContainer = {};
  const categoryWrapper = (
    <div className={MuteStyle.wrapper}>
      {CurrentPage.Category.map((category) => {
        let name = category;
        if (category === '전체') name = '일반';

        const previewInput = <input type="checkbox" style={{ margin: '0.25rem' }} />;
        const articleInput = <input type="checkbox" style={{ margin: '0.25rem' }} />;

        categoryContainer[name] = {
          previewMute: previewInput,
          articleMute: articleInput,
        };

        return (
          <div className={MuteStyle.item}>
            <div>{name}</div>
            <div>
              <label>{previewInput}미리보기 뮤트</label>
              <label>{articleInput}게시물 뮤트</label>
            </div>
          </div>
        );
      })}
    </div>
  );

  const channel = CurrentPage.Channel.ID;

  addSetting({
    header: '뮤트',
    group: [
      {
        title: '공지사항 접기',
        content: hideNotice,
      },
      {
        title: '사용자 목록',
        description: (
          <>
            지정한 유저의 게시물과 댓글을 숨깁니다.
            <br />
            Regex 문법을 지원하기 때문에 특수문자 사용 시 역슬래시를 붙여야합니다.
            <br />
            사용 시 역슬래시를 붙여 작성해야하는 특수문자 목록
            <br />
            <ul>
              <li>소괄호()</li>
              <li>마침표.</li>
            </ul>
          </>
        ),
        content: userMute,
        type: 'wide',
      },
      {
        title: '키워드 목록',
        description: (
          <>
            지정한 키워드가 포함된 제목을 가진 게시물과 댓글을 숨깁니다.
            <br />
            Regex 문법을 지원하기 때문에 특수문자 사용 시 역슬래시를 붙여야합니다.
            <br />
            사용 시 역슬래시를 붙여 작성해야하는 특수문자 목록
            <br />
            <ul>
              <li>소괄호()</li>
              <li>중괄호{'{}'}</li>
              <li>대괄호[]</li>
              <li>마침표.</li>
              <li>플러스+</li>
              <li>물음표?</li>
              <li>달러기호$</li>
              <li>캐럿^</li>
              <li>별*</li>
              <li>슬래시/</li>
              <li>역슬래시\</li>
              <li>하이픈-</li>
              <li>파이프|</li>
            </ul>
          </>
        ),
        content: keywordMute,
        type: 'wide',
      },
      {
        title: '카테고리 설정',
        description: (
          <>
            미리보기 뮤트: 해당 카테고리 게시물의 미리보기를 제거합니다.
            <br />
            게시물 뮤트: 해당 카테고리의 게시물을 숨깁니다.
          </>
        ),
        content: categoryWrapper,
        type: 'wide',
      },
    ],
    valueCallback: {
      save() {
        setValue(MUTE_NOTICE, hideNotice.value === 'true');
        setValue(
          BLOCK_USER,
          userMute.value.split('\n').filter((i) => i !== '')
        );
        setValue(
          BLOCK_KEYWORD,
          keywordMute.value.split('\n').filter((i) => i !== '')
        );

        const config = getValue(MUTE_CATEGORY);
        let channelConfig = config[channel];
        if (!channelConfig) channelConfig = {};

        for (const key in categoryContainer) {
          if (categoryContainer[key]) {
            const row = categoryContainer[key];
            const preview = row.previewMute.checked;
            const article = row.articleMute.checked;

            if (preview || article) {
              channelConfig[key] = {
                mutePreview: preview,
                muteArticle: article,
              };
            } else {
              delete channelConfig[key];
            }
          }
        }

        setValue(MUTE_CATEGORY, { ...config, [channel]: channelConfig });
      },
      load() {
        hideNotice.value = getValue(MUTE_NOTICE);
        userMute.value = getValue(BLOCK_USER).join('\n');
        keywordMute.value = getValue(BLOCK_KEYWORD).join('\n');

        const config = getValue(MUTE_CATEGORY)[channel];
        if (!config) return;

        for (const key in categoryContainer) {
          if (config[key]) {
            const { mutePreview: preview, muteArticle: article } = config[key];
            categoryContainer[key].previewMute.checked = preview;
            categoryContainer[key].articleMute.checked = article;
          }
        }
      },
    },
  });
}

function addArticleMenu() {
  const userList = getValue(BLOCK_USER);
  const user = CurrentPage.Article.Author;
  const userID = CurrentPage.Article.AuthorID.replace('(', '\\(')
    .replace(')', '\\)')
    .replace('.', '\\.');
  const filter = `${user === userID ? '^' : ''}${userID}$`;
  const indexed = userList.indexOf(filter);

  if (indexed > -1) {
    ArticleMenu.addHeaderBtn({
      text: '뮤트 해제',
      icon: 'ion-ios-refresh-empty',
      description: '게시물 작성자의 뮤트를 해제합니다.',
      onClick(event) {
        event.preventDefault();

        userList.splice(indexed, 1);
        setValue(BLOCK_USER, userList);
        window.location.reload();
      },
    });
  } else {
    ArticleMenu.addHeaderBtn({
      text: '뮤트',
      icon: 'ion-ios-close',
      description: '게시물 작성자를 뮤트합니다.',
      onClick(event) {
        event.preventDefault();

        userList.push(filter);
        setValue(BLOCK_USER, userList);
        window.history.back();
      },
    });
  }
}

function mutePreview() {
  const channel = CurrentPage.Channel.ID;
  const config = getValue(MUTE_CATEGORY)[channel];
  if (!config) return;

  const articles = document.querySelectorAll('a.vrow:not(.notice)');
  articles.forEach((article) => {
    const badge = article.querySelector('.badge');
    if (badge === null) return;

    let category = badge.textContent;
    category = category === '' ? '일반' : category;
    if (!config[category]) return;

    const { mutePreview: filtered } = config[category];
    if (!filtered) return;

    const preview = article.querySelector('.vrow-preview');
    if (preview) preview.remove();
  });
}

function muteNotice() {
  if (!getValue(MUTE_NOTICE)) return;

  if (document.readyState !== 'complete') {
    window.addEventListener(
      'load',
      () => {
        muteNotice();
      },
      { once: true }
    );
    return;
  }

  const itemContainer = document.querySelector(
    'div.board-article-list .list-table, div.included-article-list .list-table'
  );
  if (!itemContainer) return;
  const notices = itemContainer.querySelectorAll('a.vrow.notice-board');
  let noticeCount = 0;
  for (const notice of notices) {
    if (notice !== notices[notices.length - 1]) {
      notice.classList.add('filtered');
      notice.classList.add('filtered-notice');
      noticeCount += 1;
    } else {
      let unfilterBtn = itemContainer.querySelector('.notice-unfilter');
      if (!unfilterBtn) {
        // 사용자가 공식 공지 숨기기 기능을 사용하지 않음
        unfilterBtn = (
          <a className="vrow notice notice-unfilter">
            <div className="vrow-top">
              숨겨진 공지 펼치기(
              <span className="notice-filter-count">{noticeCount}</span>개){' '}
              <span className="ion-android-archive" />
            </div>
          </a>
        );
        unfilterBtn.addEventListener('click', () => {
          itemContainer.classList.add('show-filtered-notice');
          unfilterBtn.style.display = 'none';
        });
        notice.insertAdjacentElement('afterend', unfilterBtn);
      }
    }
  }
}

const ContentTypeString = {
  keyword: '키워드',
  user: '사용자',
  category: '카테고리',
  deleted: '삭제됨',
  all: '전체',
};

function muteContent(viewQuery) {
  if (document.readyState !== 'complete') {
    window.addEventListener(
      'load',
      () => {
        muteContent(viewQuery);
      },
      { once: true }
    );
    return;
  }

  const count = {};
  for (const key of Object.keys(ContentTypeString)) {
    count[key] = 0;
  }

  const channel = CurrentPage.Channel.ID;
  let userlist = getValue(BLOCK_USER);
  let keywordlist = getValue(BLOCK_KEYWORD);
  const categoryConfig = getValue(MUTE_CATEGORY)[channel];

  if ((unsafeWindow.LiveConfig || undefined) && unsafeWindow.LiveConfig.mute !== undefined) {
    userlist.push(...unsafeWindow.LiveConfig.mute.users);
    keywordlist.push(...unsafeWindow.LiveConfig.mute.keywords);
    userlist = Array.from(new Set(userlist));
    keywordlist = Array.from(new Set(keywordlist));
  }

  let itemContainer;
  let contents = null;
  let keywordSelector = '';
  let targetElement = null;
  let insertPosition = '';
  if (viewQuery === 'board') {
    itemContainer = document.querySelector(
      'div.board-article-list .list-table, div.included-article-list .list-table'
    );
    targetElement = itemContainer;
    contents = document.querySelectorAll('a.vrow:not(.notice)');
    keywordSelector = '.col-title';
    insertPosition = 'afterbegin';
  } else if (viewQuery === 'comment') {
    itemContainer = document.querySelector('#comment');
    targetElement = itemContainer.querySelector('.list-area');
    contents = document.querySelectorAll('#comment .comment-item');
    keywordSelector = '.message';
    insertPosition = 'beforebegin';
  }

  if (!itemContainer) return;

  contents.forEach((item) => {
    const keywordElement = item.querySelector(keywordSelector);
    const userElement = item.querySelector('.user-info');
    if (!keywordElement || !userElement) return;

    const keywordText = keywordElement.innerText;
    const userText = parseUserInfo(userElement);
    const categoryElement = item.querySelector('.badge');
    let category;
    if (categoryElement === null || categoryElement.textContent === '') {
      category = '일반';
    } else {
      category = categoryElement.textContent;
    }

    const keywordAllow =
      keywordlist.length === 0 ? false : new RegExp(keywordlist.join('|')).test(keywordText);
    const userAllow = userlist.length === 0 ? false : new RegExp(userlist.join('|')).test(userText);
    let categoryAllow = false;

    if (channel && categoryConfig && categoryConfig[category]) {
      categoryAllow = categoryConfig[category].muteArticle;
    }

    if (keywordAllow) {
      item.classList.add('filtered');
      item.classList.add('filtered-keyword');
      count.keyword += 1;
      count.all += 1;
    }

    if (userAllow) {
      item.classList.add('filtered');
      item.classList.add('filtered-user');
      count.user += 1;
      count.all += 1;
    }

    if (categoryAllow) {
      item.classList.add('filtered');
      item.classList.add('filtered-category');
      count.category += 1;
      count.all += 1;
    }

    if (item.classList.contains('deleted')) {
      item.classList.add('filtered');
      item.classList.add('filtered-deleted');
      count.deleted += 1;
      count.all += 1;
    }
  });

  let toggleHeader = itemContainer.querySelector('.frontend-header');
  if (toggleHeader) toggleHeader.remove();
  toggleHeader = (
    <div className="frontend-header">
      <span className="filter-title">필터된 게시물</span>
      <span className="filter-count-container" />
    </div>
  );

  const container = toggleHeader.querySelector('.filter-count-container');

  if (count.all > 0) {
    targetElement.insertAdjacentElement(insertPosition, toggleHeader);

    for (const key of Object.keys(count)) {
      if (count[key] > 0) {
        let className = `show-filtered-${key}`;
        if (key === 'all') className = 'show-filtered';

        const btn = (
          <span className={`filter-count filter-count-${key}`}>
            {ContentTypeString[key]} ({count[key]})
          </span>
        );
        container.append(btn);
        btn.addEventListener('click', () => {
          if (targetElement.classList.contains(className)) {
            targetElement.classList.remove(className);
            toggleHeader.classList.remove(className);
          } else {
            targetElement.classList.add(className);
            toggleHeader.classList.add(className);
          }
        });
      }
    }
  }
}
