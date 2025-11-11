document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'AIzaSyAx_TeM2YO64l0LOecgUq1wwkN2O6t6dPA';

    // --- 要素の取得 ---
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
    // [削除] キュー関連の要素取得を削除

    // --- 状態管理のための変数 ---
    let currentSearchQuery = '';
    let nextPageToken = '';
    const fonts = ['gothic', 'kaisho', 'pixel'];
    let currentFontIndex = 0;
    let commentsNextPageToken = null;
    let currentVideoIdForComments = null;
    // [削除] videoQueue を削除

    // ===================================================
    // イベントリスナーの設定
    // ===================================================
    resetAllButton.addEventListener('click', handleResetAll);
    fontToggleButton.addEventListener('click', toggleFont);
    searchButton.addEventListener('click', handleSearch);
    searchQueryInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    clearSearchButton.addEventListener('click', () => clearSearchResults(true));
    loadMoreButton.addEventListener('click', loadMoreResults);
    buttonsContainer.addEventListener('click', handlePlaylistSelection);

    clearPlayerButton.addEventListener('click', () => {
        videoContainer.innerHTML = '';
        videoDetailsContainer.innerHTML = '';
        // [削除] キュー関連の処理を削除
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
    
    // [削除] ドラッグ＆ドロップのイベントリスナーを削除

    // ===================================================
    // 機能ごとのハンドラー関数
    // ===================================================
    function handleResetAll() {
        videoContainer.innerHTML = '';
        videoDetailsContainer.innerHTML = '';
        // [削除] キュー関連の処理を削除
        closePlaylistPlayer();
        clearSearchResults(true);
        showMessage('');
    }

    function toggleFont() { currentFontIndex = (currentFontIndex + 1) % fonts.length; body.dataset.font = fonts[currentFontIndex]; }
    
    async function handleSearch() {
        const query = searchQueryInput.value.trim();
        if (!query) {
            showMessage('キーワード又はURLを入力してください。');
            return;
        }
        const videoId = extractVideoId(query);
        if (videoId) {
            clearSearchResults(true);
            displayVideoInMainPlayer(videoId);
            searchQueryInput.value = '';
            return;
        }
        if (API_KEY === 'YOUR_API_KEY') {
            showMessage('エラー: APIキーが設定されていません。`script.js`を編集してください。');
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
        if (pageToken) {
            apiUrl += `&pageToken=${pageToken}`;
        }
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (!response.ok || data.error) {
                console.error('API Error:', data.error);
                const reason = data.error?.errors[0]?.reason || '不明なエラー';
                const message = data.error?.message || 'APIリクエストに失敗しました。';
                showMessage(`檢索エラー: ${message} (理由: ${reason})`);
                searchResultsContainer.innerHTML = '';
                return;
            }
            if (!pageToken) {
                showMessage('');
            }
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    if (!item.id.videoId) return;
                    const resultVideoId = item.id.videoId;
                    const videoTitle = item.snippet.title;
                    const thumbnailUrl = item.snippet.thumbnails.high.url;
                    
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    resultItem.dataset.videoId = resultVideoId;
                    resultItem.innerHTML = `<img src="${thumbnailUrl}" alt="${videoTitle}"><div class="video-title">${videoTitle}</div>`;
                    
                    resultItem.addEventListener('click', () => {
                        document.querySelectorAll('.search-result-item.selected').forEach(el => el.classList.remove('selected'));
                        resultItem.classList.add('selected');
                        displayVideoInMainPlayer(resultVideoId);
                    });

                    // [削除] ドラッグ可能にする設定を削除

                    searchResultsContainer.appendChild(resultItem);
                });
            } else if (!pageToken) {
                showMessage('檢索結果が見つかりませんでした。');
            }
            nextPageToken = data.nextPageToken || '';
            loadMoreButton.style.display = nextPageToken ? 'inline-block' : 'none';
        } catch (error) {
            console.error('Fetch Error:', error);
            showMessage('檢索中に通信エラーが発生しました。コンソールを確認してください。');
        }
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

    // ===================================================
    // ヘルパー関数
    // ===================================================

    async function displayVideoInMainPlayer(videoId) {
        videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        videoDetailsContainer.innerHTML = '<p>詳細情報を讀込中...</p>';
        // [削除] キューセクションの表示処理を削除
        
        try {
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const video = data.items[0];
                const title = video.snippet.title;
                const channelTitle = video.snippet.channelTitle;
                const publishedAt = new Date(video.snippet.publishedAt).toLocaleDateString('ja-JP');
                const description = video.snippet.description;
                const linkedDescription = linkify(description);
                const viewCount = Number(video.statistics?.viewCount ?? 0).toLocaleString('ja-JP');
                const likeCount = Number(video.statistics?.likeCount ?? 0).toLocaleString('ja-JP');

                videoDetailsContainer.innerHTML = `
                    <h3 class="video-details-title">${title}</h3>
                    <div class="video-details-meta">
                        <span class="video-details-channel">チャンネル: ${channelTitle}</span>
                        <span>${viewCount} 回再生</span>
                        <span>高評価: ${likeCount}</span>
                        <span>投稿日: ${publishedAt}</span>
                    </div>
                    <div class="video-details-description">${linkedDescription}</div>
                    <div class="section-header">
                        <h4 class="comments-title">コメント</h4>
                        <button id="toggle-comments-button" class="toggle-section-button">コメントを表示</button>
                    </div>
                    <div id="comments-section" class="hidden">
                        <div id="comments-list-wrapper">
                            <div id="comments-list"></div>
                        </div>
                        <div class="load-more-comments-container">
                            <button id="load-more-comments-button" style="display: none;"></button>
                        </div>
                    </div>
                `;
                currentVideoIdForComments = videoId;
                commentsNextPageToken = null;
                document.getElementById('toggle-comments-button').addEventListener('click', handleToggleComments);
                document.getElementById('load-more-comments-button').addEventListener('click', handleLoadMoreComments);
            } else {
                videoDetailsContainer.innerHTML = '<p>詳細情報の取得に失敗しました。</p>';
            }
        } catch (error) {
            console.error('Failed to fetch video details:', error);
            videoDetailsContainer.innerHTML = '<p>詳細情報の取得中にエラーが発生しました。</p>';
        }
    }

    async function fetchAndDisplayComments(videoId, pageToken = null) {
        const commentsListEl = document.getElementById('comments-list');
        const loadMoreBtn = document.getElementById('load-more-comments-button');

        if (pageToken) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = '讀込中...';
        } else {
            commentsListEl.innerHTML = '<p>コメントを讀込中...</p>';
        }

        let commentsApiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&key=${API_KEY}&order=relevance&maxResults=15`;
        if (pageToken) {
            commentsApiUrl += `&pageToken=${pageToken}`;
        }

        try {
            const response = await fetch(commentsApiUrl);
            const data = await response.json();

            if (data.error) {
                if (data.error.errors[0].reason === 'commentsDisabled') {
                    commentsListEl.innerHTML = '<p>この動畫ではコメントが無効になっています。</p>';
                } else {
                    console.error('Comment API Error:', data.error);
                    commentsListEl.innerHTML = '<p>コメントの讀込中にエラーが発生しました。</p>';
                }
                return;
            }

            const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });
            let newCommentsHtml = '';

            data.items.forEach(item => {
                const topLevelComment = item.snippet.topLevelComment.snippet;
                newCommentsHtml += createCommentHtml(topLevelComment, rtf);

                if (item.replies && item.replies.comments && item.replies.comments.length > 0) {
                    item.replies.comments.forEach(reply => {
                        newCommentsHtml += `<div class="comment-reply">${createCommentHtml(reply.snippet, rtf)}</div>`;
                    });
                }
            });

            if (pageToken) {
                commentsListEl.innerHTML += newCommentsHtml;
            } else {
                commentsListEl.innerHTML = newCommentsHtml || '<p>コメントはありません。</p>';
            }

            commentsNextPageToken = data.nextPageToken || null;

            if (commentsNextPageToken) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = '更に表示';
            } else {
                loadMoreBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('Failed to fetch comments:', error);
            commentsListEl.innerHTML = '<p>コメントの讀込中に通信エラーが発生しました。</p>';
        }
    }

    function createCommentHtml(commentSnippet, rtf) {
        return `
            <div class="comment-item">
                <div class="comment-author-thumbnail">
                    <img src="${commentSnippet.authorProfileImageUrl}" alt="${commentSnippet.authorDisplayName}">
                </div>
                <div class="comment-content">
                    <div>
                        <span class="comment-author-name">${commentSnippet.authorDisplayName}</span>
                        <span class="comment-published-date">${formatTimeAgo(new Date(commentSnippet.publishedAt), rtf)}</span>
                    </div>
                    <div class="comment-text">${commentSnippet.textDisplay}</div>
                    <div class="comment-likes">👍 ${commentSnippet.likeCount.toLocaleString('ja-JP')}</div>
                </div>
            </div>
        `;
    }

    function linkify(plainText) {
        if (!plainText) {
            return '';
        }
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return plainText.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    function formatTimeAgo(date, rtf) { const now = new Date(); const diffSeconds = Math.round((now - date) / 1000); const diffMinutes = Math.round(diffSeconds / 60); const diffHours = Math.round(diffMinutes / 60); const diffDays = Math.round(diffHours / 24); const diffWeeks = Math.round(diffDays / 7); const diffMonths = Math.round(diffDays / 30.44); const diffYears = Math.round(diffDays / 365.25); if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second'); if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute'); if (diffHours < 24) return rtf.format(-diffHours, 'hour'); if (diffDays < 7) return rtf.format(-diffDays, 'day'); if (diffWeeks < 5) return rtf.format(-diffWeeks, 'week'); if (diffMonths < 12) return rtf.format(-diffMonths, 'month'); return rtf.format(-diffYears, 'year'); }
    function clearSearchResults(clearQuery = true) { searchResultsContainer.innerHTML = ''; loadMoreButton.style.display = 'none'; nextPageToken = ''; if (clearQuery) { searchQueryInput.value = ''; currentSearchQuery = ''; showMessage(''); } }
    
    function openPlaylistPlayer(playlistId) {
        if (playlists[playlistId]) {
            const embedUrlBase = 'https://www.youtube.com/embed/videoseries?list=';
            const embedUrl = embedUrlBase + playlists[playlistId];
            
            playlistContainer.innerHTML = `
                <iframe id="youtube-player" src="${embedUrl}" 
                        title="YouTube video player" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen></iframe>
            `;
            
            playlistContainer.style.display = 'block';
            currentPlaylistId = playlistId;
        }
    }
    
    function closePlaylistPlayer() {
        playlistContainer.innerHTML = ''; 
        playlistContainer.style.display = 'none';
        currentPlaylistId = null;
    }
    
    function showMessage(text) { messageArea.textContent = text; }
    function extractVideoId(url) { const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/; const match = url.match(regex); return match ? match[1] : null; }

    // [削除] キューリストの更新関数を削除
});
