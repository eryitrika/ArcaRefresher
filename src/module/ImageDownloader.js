import stylesheet from '../css/ImageDownloader.css';

export function apply() {
    const data = parse();
    if(data.length == 0) return;

    document.head.append(<style>{stylesheet}</style>);

    const body = (
        <div class="article-images hidden">
            <div class="article-list">
                <div class="list-table">
                    <div class="vrow head">
                        <div class="vrow-top">
                            <span class="vcol col-thumb">썸네일</span>
                            <span class="vcol col-image">이미지</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const itemElement = (
        <div class="vrow">
            <div class="vrow-top">
                <span class="vcol col-thumb" />
                <a class="vcol col-image" href="#">NAME</a>
            </div>
        </div>
    );

    const footerItem = (
        <div class="vrow">
            <div class="vrow-top">
                <button class="vcol col-download btn btn-success">일괄 다운로드</button>
            </div>
        </div>
    );

    const button = <a href="#" class="btn btn-success"><span class="ion-ios-download-outline" /> 이미지 다운로드 목록 보이기</a>;
    button.addEventListener('click', event => {
        event.preventDefault();

        if(body.classList.contains('hidden')) {
            body.classList.remove('hidden');
        }
        else {
            body.classList.add('hidden');
        }
    });

    document.querySelector('.article-body').insertAdjacentElement('afterend', body);
    document.querySelector('.article-body').insertAdjacentElement('afterend', button);
    const list = body.querySelector('.list-table');

    list.addEventListener('click', onListClick);

    async function onListClick(event) {
        if(event.target.tagName != 'A') return;

        event.preventDefault();

        const url = event.target.getAttribute('data-url');
        const file = await download(url);

        window.saveAs(file, event.target.innerText);
    }

    data.forEach(dataItem => {
        const clone = itemElement.cloneNode(true);
        if(dataItem.type == 'image') {
            clone.querySelector('.col-thumb').append(<img src={dataItem.thumb} />);
        }
        else {
            clone.querySelector('.col-thumb').append(<div class="video-placeholder"><span class="ion-ios-videocam"> 동영상</span></div>);
        }
        clone.querySelector('.col-image').innerText = dataItem.image;
        clone.querySelector('.col-image').setAttribute('data-url', dataItem.url);

        list.append(clone);
    });

    async function onDownloadAll() {
        const zip = new JSZip();
        const total = data.length;
        let current = 0;

        this.disabled = true;

        for(const d of data) {
            let file = null;

            while(file == null) {
                this.innerText = `다운로드 중...${current}/${total}`;
                file = await download(d.url);
            }
            zip.file(`${`${++current}`.padStart(3, '0')}_${d.image}`, file);
        }

        this.innerText = '일괄 다운로드';
        this.disabled = false;

        const zipblob = await zip.generateAsync({ type: 'blob' });
        const title = document.querySelector('.article-head .title').textContent.trim();
        window.saveAs(zipblob, `${title}.zip`);
    }

    footerItem.querySelector('button').addEventListener('click', onDownloadAll);
    list.append(footerItem);
}

function parse() {
    const images = document.querySelectorAll('.article-body img, .article-body video');

    const result = [];

    images.forEach(element => {
        // if(element.tagName == 'VIDEO' && element.getAttribute('data-orig') == null) return;

        let src = element.src;

        if(element.getAttribute('data-orig') != null) {
            src += `.${element.getAttribute('data-orig')}`;
        }

        const item = {};
        item.thumb = `${src}?type=list`;
        item.url = `${src}?type=orig`;
        item.image = src.replace(/.*\.arca\.live\/.*\//, '').replace(/\..*\./, '.');
        item.type = ['gif', 'png', 'jpg', 'jpeg', 'wepb'].indexOf(item.image.split('.')[1]) > -1 ? 'image' : 'video';

        result.push(item);
    });

    return result;
}

function download(url) {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            responseType: 'blob',
            onload: response => {
                resolve(response.response);
            },
        });
    });
}