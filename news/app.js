document.addEventListener('DOMContentLoaded', () => {
    const DATA_URL = `https://gist.githubusercontent.com/dodonium/1c45ccf73f719774254d1fc47cea7dd7/raw/news.json?t=${Date.now()}`;
    const app = document.getElementById('app');
    const updateInfo = document.getElementById('update-info');

    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load data");
            return response.json();
        })
        .then(data => {
            renderNews(data);
        })
        .catch(err => {
            app.innerHTML = `<div class="loading">Error loading news: ${err.message}</div>`;
        });

    function renderNews(data) {
        // 更新日時の表示
        if (data.generated_at) {
            const date = new Date(data.generated_at);
            updateInfo.textContent = `Updated: ${date.toLocaleString('ja-JP')}`;
        }

        app.innerHTML = ''; // Loading消去

        // ジャンルごとにループ
        data.genres.forEach(genre => {
            const section = document.createElement('section');
            section.className = 'genre-section';

            const title = document.createElement('h2');
            title.className = 'genre-title';
            title.textContent = genre.name;
            section.appendChild(title);

            // 記事ごとにループ
            genre.articles.forEach(article => {
                const card = createNewsCard(article);
                section.appendChild(card);
            });

            app.appendChild(section);
        });
    }

    function createNewsCard(article) {
        const articleEl = document.createElement('article');
        articleEl.className = 'news-card';

        // サムネイル画像の処理 (nullの場合はデフォルト画像にするか、非表示にするなど)
        let imgTag = '';
        if (article.thumbnail && article.thumbnail !== "No Thumbnail") {
            imgTag = `<img src="${article.thumbnail}" alt="thumbnail" class="news-thumb" loading="lazy">`;
        } else {
            // 画像がない場合のプレースホルダー（必要なら）
             imgTag = `<div class="news-thumb" style="background-color: #ddd; display: flex; align-items: center; justify-content: center; color: #888;">No Image</div>`;
        }

        // ソースリンクの生成
        const sourcesHtml = article.sources.map(src => 
            `<a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.name}</a>`
        ).join(' | ');

        articleEl.innerHTML = `
            ${imgTag}
            <div class="news-content">
                <h3 class="news-title">${article.title}</h3>
                <p class="news-body">${article.content}</p>
                <div class="source-list">
                    Sources: ${sourcesHtml}
                </div>
            </div>
        `;

        return articleEl;
    }
});