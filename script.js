document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'AIzaSyAx_TeM2YO64l0LOecgUq1wwkN2O6t6dPA';

    const body = document.body;
    const resetAllButton = document.getElementById('reset-all-button');
    const fontToggleButton = document.getElementById('font-toggle-button');
    const focusModeButton = document.getElementById('focus-mode-button');
    const focusOverlay = document.getElementById('focus-overlay');
    const clearPlayerButton = document.getElementById('clear-player-button');
    const searchQueryInput = document.getElementById('search-query');
    const searchButton = document.getElementById('search-button');
    const clearSearchButton = document.getElementById('clear-search-button');
    const loadMoreButton = document.getElementById('load-more-button');
    const messageArea = document.getElementById('message-area');
    const videoContainer = document.getElementById('video-container');
    const videoDetailsContainer = document.getElementById('video-details-container');
    const searchResultsContainer = document.getElementById('search-results-container');
    const buttonsContainer = document.getElementById('playlist-buttons');
    const playlistContainer = document.getElementById('playlist-container');
    const memoArea = document.getElementById('memo-area');
    const toggleMemoButton = document.getElementById('toggle-memo-button');
    const togglePlaylistButton = document.getElementById('toggle-playlist-button');
    const memoFontSizeSlider = document.getElementById('memo-font-size-slider');
    const memoFontSizeValue = document.getElementById('memo-font-size-value');
    const toggleMainButton = document.getElementById('toggle-main-button');
    const mainContentSection = document.getElementById('main-content-section');

    let currentSearchQuery = '';
    let nextPageToken = '';
    const fonts = ['gothic', 'kaisho', 'pixel'];
    let currentFontIndex = 0;
    let commentsNextPageToken = null;
    let currentVideoIdForComments = null;

    let player = null;

    resetAllButton.addEventListener('click', handleResetAll);
    fontToggleButton.addEventListener('click', toggleFont);
    searchButton.addEventListener('click', handleSearch);
    searchQueryInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    clearSearchButton.addEventListener('click', () => clearSearchResults(true));
    loadMoreButton.addEventListener('click', loadMoreResults);
    buttonsContainer.addEventListener('click', handlePlaylistSelection);

    clearPlayerButton.addEventListener('click', () => {
        if (player) {
            player.destroy();
            player = null;
        }
        videoContainer.innerHTML = '';
        videoDetailsContainer.innerHTML = '';
        showMessage('動畫プレーヤーをクリアしました。');
    });

    focusModeButton.addEventListener('click', () => {
        const isHidden = focusOverlay.classList.toggle('hidden');
        const icon = focusModeButton.querySelector('i');
        if (isHidden) {
            focusModeButton.title = '集中モード';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            focusModeButton.title = '集中モード解除';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    });

    toggleMemoButton.addEventListener('click', () => {
        const memoSection = document.getElementById('memo-section');
        const isHidden = memoSection.classList.contains('hidden');
        memoSection.classList.toggle('hidden');
        toggleMemoButton.textContent = isHidden ? '非表示にする' : '表示する';
    });

    togglePlaylistButton.addEventListener('click', () => {
        const playlistSection = document.getElementById('playlist-section');
        const isHidden = playlistSection.classList.contains('hidden');
        playlistSection.classList.toggle('hidden');
        togglePlaylistButton.textContent = isHidden ? '非表示にする' : '表示する';
    });

    toggleMainButton.addEventListener('click', () => {
        const isHidden = mainContentSection.classList.toggle('hidden');
        toggleMainButton.textContent = isHidden ? '表示する' : '非表示にする';
    });

    memoFontSizeSlider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        memoArea.style.fontSize = `${newSize}px`;
        memoFontSizeValue.textContent = `${newSize}px`;
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('timestamp-link')) {
            const seconds = Number(e.target.dataset.time);
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(seconds, true);
                videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    function handleResetAll() {
        if (player) {
            player.destroy();
            player = null;
        }
        videoContainer.innerHTML = '';
        videoDetailsContainer.innerHTML = '';
        closePlaylistPlayer();
        clearSearchResults(true);
        showMessage('');
        memoArea.value = '';
    }

    function toggleFont() { currentFontIndex = (currentFontIndex + 1) % fonts.length; body.dataset.font = fonts[currentFontIndex]; }

    async function handleSearch() {
        const query = searchQueryInput.value.trim();
        if (!query) {
            showMessage('キーワード又はURLを入力してください。');
            return;
        }
        const { videoId, startTime } = parseVideoUrl(query);
        
        if (videoId) {
            clearSearchResults(true);
            displayVideoInMainPlayer(videoId, startTime);
            searchQueryInput.value = '';
            return;
        }
        
        currentSearchQuery = query;
        nextPageToken = '';
        searchResultsContainer.innerHTML = '';
        loadMoreButton.style.display = 'none';
        showMessage('檢索中...');
        await fetchAndDisplayVideos(currentSearchQuery);
    }

    async function loadMoreResults() {
        if (!currentSearchQuery || !nextPageToken) return;
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = '讀込中...';
        await fetchAndDisplayVideos(currentSearchQuery, nextPageToken);
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = '更に表示';
    }

    async function fetchAndDisplayVideos(query, pageToken = '') {
        let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}&maxResults=8`;
        if (pageToken) apiUrl += `&pageToken=${pageToken}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (!response.ok || data.error) {
                showMessage(`檢索エラー: ${data.error?.message}`);
                return;
            }
            if (!pageToken) showMessage('');
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    if (!item.id.videoId) return;
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    resultItem.innerHTML = `<img src="${item.snippet.thumbnails.high.url}"><div class="video-title">${item.snippet.title}</div>`;
                    resultItem.addEventListener('click', () => {
                        document.querySelectorAll('.search-result-item.selected').forEach(el => el.classList.remove('selected'));
                        resultItem.classList.add('selected');
                        displayVideoInMainPlayer(item.id.videoId);
                    });
                    searchResultsContainer.appendChild(resultItem);
                });
            } else if (!pageToken) showMessage('檢索結果が見つかりませんでした。');
            nextPageToken = data.nextPageToken || '';
            loadMoreButton.style.display = nextPageToken ? 'inline-block' : 'none';
        } catch (error) { showMessage('通信エラーが発生しました。'); }
    }

    const playlists = {
        'work-bgm': 'PLbFc77UMakZ4-XwIAEuBAIiYOhYO125U8',
        'cozy-jazz': 'PLbFc77UMakZ4-cS2DJSYCzypYWpMzPdk6',
        'situation-voice': 'PLbFc77UMakZ7qvtBsjvET8yAdbGE_zhwI',
        'genshin-piano': 'PLbFc77UMakZ7NFu8CczrykC9jaOcsyi3I',
        'twicasting': 'PLbFc77UMakZ7bAwQSjmQX97QigIFs4K-L',
        'one-week': 'PLbFc77UMakZ6Trt4aqidpPPmMQjDZcVsV',
        'swimsuit': 'PLbFc77UMakZ50MmkJXVjoMrrH0I3Zss5o',
        '9-mine': 'PLRvO41EShTHMH7x0swA0PV_WCVAmzKk0s',
        '9-ship': 'PLRvO41EShTHPtvXUpQnRYPV7AaiTyb9dP'
    };
    let currentPlaylistId = null;

    function handlePlaylistSelection(event) {
        if (!event.target.matches('button.playlist-toggle')) return;
        const playlistId = event.target.dataset.playlistId;
        if (playlistId === currentPlaylistId) {
            closePlaylistPlayer();
        } else {
            openPlaylistPlayer(playlistId);
        }
    }

    function handleToggleComments() {
        const commentsSection = document.getElementById('comments-section');
        const toggleBtn = document.getElementById('toggle-comments-button');
        const isHidden = commentsSection.classList.contains('hidden');
        commentsSection.classList.toggle('hidden');
        if (isHidden) {
            toggleBtn.textContent = 'コメントを非表示';
            if (document.getElementById('comments-list').innerHTML === '') {
                fetchAndDisplayComments(currentVideoIdForComments);
            }
        } else {
            toggleBtn.textContent = 'コメントを表示';
        }
    }

    function handleLoadMoreComments() {
        if (currentVideoIdForComments && commentsNextPageToken) {
            fetchAndDisplayComments(currentVideoIdForComments, commentsNextPageToken);
        }
    }

    async function displayVideoInMainPlayer(videoId, startTime = 0) {
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById({videoId: videoId, startSeconds: startTime});
        } else {
            videoContainer.innerHTML = '<div id="youtube-player"></div>';
            
            if (typeof YT !== 'undefined' && YT.Player) {
                player = new YT.Player('youtube-player', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        'autoplay': 1,
                        'playsinline': 1,
                        'start': startTime
                    }
                });
            } else {
                window.onYouTubeIframeAPIReady = function() {
                    player = new YT.Player('youtube-player', {
                        height: '100%',
                        width: '100%',
                        videoId: videoId,
                        playerVars: { 
                            'autoplay': 1,
                            'start': startTime
                        }
                    });
                };
            }
        }

        videoDetailsContainer.innerHTML = '<p>詳細情報を讀込中...</p>';
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const video = data.items[0];
                const descriptionHtml = linkify(escapeHtml(video.snippet.description));

                videoDetailsContainer.innerHTML = `
                    <h3 class="video-details-title">${video.snippet.title}</h3>
                    <div class="video-details-meta">
                        <span class="video-details-channel">チャンネル: ${video.snippet.channelTitle}</span>
                        <span>${Number(video.statistics?.viewCount).toLocaleString()} 回再生</span>
                        <span>高評価: ${Number(video.statistics?.likeCount).toLocaleString()}</span>
                        <span>投稿日: ${new Date(video.snippet.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="video-details-description">${descriptionHtml}</div>
                    <div class="section-header">
                        <h4 class="comments-title">コメント</h4>
                        <button id="toggle-comments-button" class="toggle-section-button">コメントを表示</button>
                    </div>
                    <div id="comments-section" class="hidden">
                        <div id="comments-list-wrapper"><div id="comments-list"></div></div>
                        <div class="load-more-comments-container"><button id="load-more-comments-button" style="display: none;"></button></div>
                    </div>`;
                currentVideoIdForComments = videoId;
                commentsNextPageToken = null;
                document.getElementById('toggle-comments-button').addEventListener('click', handleToggleComments);
                document.getElementById('load-more-comments-button').addEventListener('click', handleLoadMoreComments);
            }
        } catch (error) { videoDetailsContainer.innerHTML = '<p>詳細情報の取得エラー</p>'; }
    }

    async function fetchAndDisplayComments(videoId, pageToken = null) {
        const commentsListEl = document.getElementById('comments-list');
        const loadMoreBtn = document.getElementById('load-more-comments-button');
        if (pageToken) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = '讀込中...'; }
        else commentsListEl.innerHTML = '<p>コメントを讀込中...</p>';

        let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&key=${API_KEY}&order=relevance&maxResults=15`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) { commentsListEl.innerHTML = '<p>コメント無効またはエラー。</p>'; return; }
            const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });
            let html = '';
            data.items.forEach(item => {
                const c = item.snippet.topLevelComment.snippet;
                html += createCommentHtml(c, rtf);
                if (item.replies) item.replies.comments.forEach(r => { html += `<div class="comment-reply">${createCommentHtml(r.snippet, rtf)}</div>`; });
            });
            if (pageToken) commentsListEl.innerHTML += html;
            else commentsListEl.innerHTML = html || '<p>コメントはありません。</p>';
            commentsNextPageToken = data.nextPageToken || null;
            loadMoreBtn.style.display = commentsNextPageToken ? 'block' : 'none';
            if (commentsNextPageToken) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = '更に表示'; }
        } catch (e) { commentsListEl.innerHTML = '<p>エラー発生</p>'; }
    }

    function createCommentHtml(c, rtf) {
        const safeText = escapeHtml(c.textOriginal);
        const textWithLinks = linkify(safeText);
        
        return `<div class="comment-item">
            <div class="comment-author-thumbnail"><img src="${c.authorProfileImageUrl}"></div>
            <div class="comment-content">
                <div><span class="comment-author-name">${c.authorDisplayName}</span><span class="comment-published-date">${new Date(c.publishedAt).toLocaleDateString()}</span></div>
                <div class="comment-text">${textWithLinks}</div>
                <div class="comment-likes">👍 ${Number(c.likeCount).toLocaleString()}</div>
            </div>
        </div>`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function linkify(text) { 
        if (!text) return '';
        
        let replacedText = text.replace(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, '<a href="$1" target="_blank">$1</a>');
        
        replacedText = replacedText.replace(/(^|[\s\n>])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g, (match, prefix, h, m, s) => {
            const hours = h ? parseInt(h, 10) : 0;
            const minutes = parseInt(m, 10);
            const seconds = parseInt(s, 10);
            const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
            return `${prefix}<span class="timestamp-link" data-time="${totalSeconds}">${h ? h+':' : ''}${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</span>`;
        });

        return replacedText;
    }

    function clearSearchResults(clearQuery = true) { searchResultsContainer.innerHTML = ''; loadMoreButton.style.display = 'none'; nextPageToken = ''; if (clearQuery) { searchQueryInput.value = ''; currentSearchQuery = ''; showMessage(''); } }
    function openPlaylistPlayer(id) {
        if (playlists[id]) {
            playlistContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/videoseries?list=${playlists[id]}" frameborder="0" allowfullscreen></iframe>`;
            playlistContainer.style.display = 'block';
            currentPlaylistId = id;
        }
    }
    function closePlaylistPlayer() { playlistContainer.innerHTML = ''; playlistContainer.style.display = 'none'; currentPlaylistId = null; }
    function showMessage(text) { messageArea.textContent = text; }
    
    function parseVideoUrl(url) {
        const videoIdMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
        const timeMatch = url.match(/[?&](?:t|start)=(\d+)/);
        return {
            videoId: videoIdMatch ? videoIdMatch[1] : null,
            startTime: timeMatch ? parseInt(timeMatch[1], 10) : 0
        };
    }

    const mathInput = document.getElementById('math-input');
    const mathPreview = document.getElementById('math-preview');
    const toggleMathButton = document.getElementById('toggle-math-button');
    const mathSection = document.getElementById('math-section');
    
    const mathFontSizeSlider = document.getElementById('math-font-size-slider');
    const mathFontSizeValue = document.getElementById('math-font-size-value');

    toggleMathButton.addEventListener('click', () => {
        const isHidden = mathSection.classList.toggle('hidden');
        toggleMathButton.textContent = isHidden ? '表示する' : '非表示にする';
        if (!isHidden) {
            renderMath();
        }
    });

    mathFontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        mathPreview.style.fontSize = val + 'px';
        mathFontSizeValue.textContent = val + 'px';
    });

    function renderMath() {
        if(mathSection.classList.contains('hidden')) return;

        const text = mathInput.value;
        const lines = text.split('\n');
        let htmlContent = '';
        
        lines.forEach(line => {
            if (line.trim() === "") {
                htmlContent += '<div class="math-line"><br></div>';
            } else {
                const safeLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                htmlContent += `<div class="math-line">\`${safeLine}\`</div>`;
            }
        });

        mathPreview.innerHTML = htmlContent;

        if (window.MathJax) {
            MathJax.typesetPromise([mathPreview]).catch((err) => console.log('MathJax Error:', err));
        }
    }

    mathInput.addEventListener('input', renderMath);
    renderMath();
});
