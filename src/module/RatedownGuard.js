import { addSetting, getValue, setValue } from '../core/Configure';
import { CurrentPage } from '../core/Parser';

export default { load };

const RATEDOWN_GUARD = { key: 'blockRatedown', defaultValue: false };

function load() {
  try {
    setupSetting();

    if (CurrentPage.Component.Article) {
      apply();
    }
  } catch (error) {
    console.error(error);
  }
}

function setupSetting() {
  const ratedownBlock = (
    <select>
      <option value="false">사용 안 함</option>
      <option value="true">사용</option>
    </select>
  );
  addSetting({
    header: '비추천 방지',
    group: [
      {
        title: '비추천 버튼을 클릭하면 재확인창을 띄웁니다.',
        content: ratedownBlock,
      },
    ],
    valueCallback: {
      save() {
        setValue(RATEDOWN_GUARD, ratedownBlock.value === 'true');
      },
      load() {
        ratedownBlock.value = getValue(RATEDOWN_GUARD);
      },
    },
  });
}

function apply() {
  if (!getValue(RATEDOWN_GUARD)) return;

  const ratedown = document.querySelector('#rateDown');
  if (ratedown == null) return;

  ratedown.addEventListener('click', (e) => {
    if (!window.confirm('비추천을 눌렀습니다.\n계속하시겠습니까?')) {
      e.preventDefault();
    }
  });
}
