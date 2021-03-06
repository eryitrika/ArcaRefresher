import { addSetting, getValue, setValue } from '../core/Configure';
import { addOnModifyArticle } from '../core/AREventHandler';
import { CurrentPage } from '../core/Parser';

import { getContrastYIQ } from '../util/ColorManager';

import styles, { stylesheet } from '../css/CategoryColor.module.css';

export default { load };

const CATEGORY_COLOR = { key: 'categoryColor', defaultValue: {} };

function load() {
  try {
    setupSetting();

    if (CurrentPage.Component.Board) {
      generateColorStyle();
      apply();
    }

    addOnModifyArticle({
      priority: 0,
      callback: apply,
    });
  } catch (error) {
    console.error(error);
  }
}

function renderColorPicker(disabled) {
  const element = <div className="pickr" />;
  const wrapper = <>{element}</>;
  const handler = new window.Pickr({
    el: element,
    theme: 'nano',
    disabled,
    lockOpacity: true,
    default: null,
    components: {
      palette: false,
      preview: true,
      opacity: false,
      hue: true,

      interaction: {
        hex: true,
        hsv: true,
        input: true,
        clear: true,
        save: true,
      },
    },
  }).on('save', () => handler.hide());

  return [wrapper, handler];
}

function setupSetting() {
  const dataContainer = {};
  const settingWrapper = (
    <div className={styles.wrapper}>
      <style>{stylesheet}</style>
      <style>{GM_getResourceText('colorpicker')}</style>
      {CurrentPage.Category.map((category) => {
        let name = category;
        if (category === '전체') name = '일반';

        const badgeElement = (
          <span className="badge badge-success" style={{ margin: '0.25rem' }}>
            {name}
          </span>
        );
        const bgElement = (
          <div>
            {badgeElement}
            제목
          </div>
        );
        const [badgeInput, badgeContainer] = renderColorPicker(name === '일반');
        const [bgInput, bgContainer] = renderColorPicker(false);
        const boldInput = <input type="checkbox" />;
        const disableVisitedInput = <input type="checkbox" />;

        badgeContainer.on('save', (color) => {
          if (color) {
            const badge = color.toHEXA().toString();
            badgeElement.style.backgroundColor = badge;
            badgeElement.style.color = getContrastYIQ(badge);
          } else {
            badgeElement.style.backgroundColor = '';
            badgeElement.style.color = '';
          }
        });
        bgContainer.on('save', (color) => {
          if (color) {
            const bg = color.toHEXA().toString();
            bgElement.style.background = `linear-gradient(90deg, ${bg}, rgba(255, 255, 255, 0))`;
            bgElement.style.color = getContrastYIQ(bg);
          } else {
            bgElement.style.background = '';
            bgElement.style.color = '';
          }
        });
        boldInput.addEventListener('click', () => {
          bgElement.style.fontWeight = boldInput.checked ? 'bold' : '';
        });

        dataContainer[name] = {
          test: {
            bg: bgElement,
            badge: badgeElement,
          },
          badge: badgeContainer,
          bgcolor: bgContainer,
          bold: boldInput,
          disableVisited: disableVisitedInput,
        };

        return (
          <div className={styles.item}>
            {bgElement}
            <div>{badgeInput}</div>
            <div>{bgInput}</div>
            <div>
              <label title="게시물 제목이 굵게 표시됩니다.">
                {boldInput}
                <span>굵게</span>
              </label>
              <label title="열어본 게시물이 회색으로 표시되지 않습니다.">
                {disableVisitedInput}
                <span>열람 색 제거</span>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );

  const channel = CurrentPage.Channel.ID;

  addSetting({
    header: '카테고리 색상 설정',
    group: [
      {
        title: '색상 변경',
        content: settingWrapper,
        type: 'wide',
      },
    ],
    valueCallback: {
      save() {
        const config = getValue(CATEGORY_COLOR);
        let channelConfig = config[channel];
        if (!channelConfig) channelConfig = {};

        for (const key in dataContainer) {
          if (dataContainer[key]) {
            const badge = dataContainer[key].badge.getSelectedColor();
            const bgcolor = dataContainer[key].bgcolor.getSelectedColor();
            const bold = dataContainer[key].bold.checked;
            const disableVisited = dataContainer[key].disableVisited.checked;

            if (badge || bgcolor || bold || disableVisited) {
              channelConfig[key] = {
                badge: badge ? badge.toHEXA().toString() : '',
                bgcolor: bgcolor ? bgcolor.toHEXA().toString() : '',
                bold,
                disableVisited,
              };
            } else {
              delete channelConfig[key];
            }
          }
        }

        setValue(CATEGORY_COLOR, { ...config, [channel]: channelConfig });
      },
      load() {
        const config = getValue(CATEGORY_COLOR)[channel];
        if (!config) return;

        for (const key in dataContainer) {
          if (config[key]) {
            const { badge, bgcolor, bold, disableVisited } = config[key];

            dataContainer[key].badge.setColor(badge || null);
            dataContainer[key].bgcolor.setColor(bgcolor || null);
            dataContainer[key].bold.checked = bold;
            dataContainer[key].disableVisited.checked = disableVisited;

            const { badge: badgeElement, bg: bgElement } = dataContainer[key].test;

            if (badge) {
              badgeElement.style.backgroundColor = badge;
              badgeElement.style.color = getContrastYIQ(badge);
            }
            if (bgcolor) {
              bgElement.style.background = `linear-gradient(90deg, ${bgcolor}, rgba(255, 255, 255, 0))`;
              bgElement.style.color = getContrastYIQ(bgcolor);
            }
            if (bold) {
              bgElement.style.fontWeight = 'bold';
            }
          }
        }
      },
    },
  });
}

const styleTable = {};

function generateColorStyle() {
  const channel = CurrentPage.Channel.ID;
  const categoryConfig = getValue(CATEGORY_COLOR)[channel];

  if (!categoryConfig) return;

  const style = [];
  for (const key in categoryConfig) {
    if (categoryConfig[key]) {
      const { badge, bgcolor, bold, disableVisited } = categoryConfig[key];
      let styleKey;
      do {
        styleKey = Math.random().toString(36).substr(2);
      } while (styleTable[styleKey]);

      if (bgcolor) {
        style.push(
          `
            .color_${styleKey} {
              background-color: ${bgcolor} !important;
              color: ${getContrastYIQ(bgcolor)};
            }
          `
        );
      }
      if (badge) {
        style.push(
          `
            .color_${styleKey} .badge {
              background-color: ${badge} !important;
              color: ${getContrastYIQ(badge)};
            }
          `
        );
      }
      if (bold) {
        style.push(
          `
            .color_${styleKey} .title {
              font-weight: ${bold ? 'bold' : 'normal'}
            }
          `
        );
      }
      if (disableVisited) {
        style.push(
          `
            .color_${styleKey}:visited {
              color: ${bgcolor ? getContrastYIQ(bgcolor) : 'var(--color-text-color)'} !important;
            }
          `
        );
      }
      styleTable[key] = styleKey;
    }
  }

  document.head.append(<style>{style}</style>);
}

function apply() {
  const articles = document.querySelectorAll('a.vrow:not(.notice)');

  articles.forEach((article) => {
    if (article.childElementCount < 2) return;

    const categoryElement = article.querySelector('.badge');
    if (!categoryElement) return;
    const category = categoryElement.textContent ? categoryElement.textContent : '일반';
    if (!styleTable[category]) return;

    article.classList.add(`color_${styleTable[category]}`);
  });
}
