document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const btnText = document.getElementById('btn-text');
    const feedLoader = document.getElementById('feed-loader');
    const timelineFeed = document.getElementById('timeline-feed');
    const feedEmpty = document.getElementById('feed-empty');
    const emptyTitle = document.getElementById('empty-title');
    const emptyMessage = document.getElementById('empty-message');
    const btnEmptyRetry = document.getElementById('btn-empty-retry');
    
    // Stats elements
    const valTotal = document.getElementById('val-total');
    const valFeatures = document.getElementById('val-features');
    const valAnnouncements = document.getElementById('val-announcements');
    const valIssues = document.getElementById('val-issues');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const tweetTextarea = document.getElementById('tweet-text');
    const charCounter = document.getElementById('char-counter');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnSendTweet = document.getElementById('btn-send-tweet');
    const toastContainer = document.getElementById('toast-container');

    let isFetching = false;
    let selectedUpdateData = null;

    // Toast Utility Function
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Custom SVG based on toast type
        const iconSvg = type === 'success' 
            ? `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`
            : `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;

        toast.innerHTML = `
            ${iconSvg}
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Slide out and destroy after 3s
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // Copy to clipboard utility
    function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg, 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy text', 'error');
        });
    }

    // Helper to get type class for colors
    function getTypeClass(type) {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('feature')) return 'type-feature';
        if (lowerType.includes('announcement')) return 'type-announcement';
        if (lowerType.includes('issue') || lowerType.includes('warning')) return 'type-issue';
        if (lowerType.includes('breaking') || lowerType.includes('deprecation')) return 'type-breaking';
        if (lowerType.includes('change') || lowerType.includes('update')) return 'type-change';
        return 'type-default';
    }

    // Process & calculate metrics from feed data
    function updateMetrics(releases) {
        let totalDays = releases.length;
        let featuresCount = 0;
        let announcementsCount = 0;
        let issuesCount = 0;

        releases.forEach(rel => {
            rel.updates.forEach(up => {
                const lowerType = up.type.toLowerCase();
                if (lowerType.includes('feature')) {
                    featuresCount++;
                } else if (lowerType.includes('announcement')) {
                    announcementsCount++;
                } else if (lowerType.includes('issue') || lowerType.includes('breaking') || lowerType.includes('warning') || lowerType.includes('deprecation')) {
                    issuesCount++;
                }
            });
        });

        // Animate counter details
        animateValue(valTotal, 0, totalDays, 800);
        animateValue(valFeatures, 0, featuresCount, 800);
        animateValue(valAnnouncements, 0, announcementsCount, 800);
        animateValue(valIssues, 0, issuesCount, 800);
    }

    // Smooth count animations for dashboard
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Main fetch controller
    async function fetchReleases(forceRefresh = false) {
        if (isFetching) return;
        isFetching = true;
        
        // Start UI spinner state
        btnRefresh.classList.add('spinning');
        btnText.textContent = 'Updating...';
        feedEmpty.style.display = 'none';
        
        if (forceRefresh) {
            timelineFeed.style.opacity = '0.5';
        } else {
            timelineFeed.style.display = 'none';
            feedLoader.style.display = 'flex';
        }

        try {
            const response = await fetch(`/api/releases${forceRefresh ? '?refresh=true' : ''}`);
            const result = await response.json();
            
            if (result.success) {
                renderTimeline(result.data);
                updateMetrics(result.data);
                
                if (forceRefresh) {
                    if (result.source === 'network') {
                        showToast('Feed refreshed successfully via Google Cloud!');
                    } else {
                        showToast('Releases loaded (from cache).');
                    }
                }
            } else {
                showErrorState('Feed Error', result.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showErrorState('Connection Lost', 'A network interface error occurred. Please verify Flask is running.');
        } finally {
            isFetching = false;
            btnRefresh.classList.remove('spinning');
            btnText.textContent = 'Refresh Feed';
            feedLoader.style.display = 'none';
            timelineFeed.style.opacity = '1';
        }
    }

    function showErrorState(title, message) {
        timelineFeed.style.display = 'none';
        feedLoader.style.display = 'none';
        feedEmpty.style.display = 'block';
        emptyTitle.textContent = title;
        emptyMessage.textContent = message;
        
        // Reset metrics
        valTotal.textContent = '0';
        valFeatures.textContent = '0';
        valAnnouncements.textContent = '0';
        valIssues.textContent = '0';
    }

    // Render timeline updates
    function renderTimeline(releases) {
        if (!releases || releases.length === 0) {
            showErrorState('No Releases Found', 'The BigQuery release feed is empty.');
            return;
        }

        timelineFeed.innerHTML = '';
        timelineFeed.style.display = 'flex';

        releases.forEach(release => {
            const dayGroup = document.createElement('section');
            dayGroup.className = 'day-group';
            
            // Build date header
            const dateRow = document.createElement('div');
            dateRow.className = 'date-row';
            
            // Format link anchor matching Google Docs format
            const anchor = release.link.split('#')[1] || '';
            
            dateRow.innerHTML = `
                <div class="date-dot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <h2 class="date-text" id="${anchor}">${release.date}</h2>
                <span class="update-count-badge">${release.updates.length} ${release.updates.length === 1 ? 'update' : 'updates'}</span>
            `;
            
            dayGroup.appendChild(dateRow);
            
            // Build grid container for updates
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'cards-grid';
            
            release.updates.forEach(up => {
                const card = document.createElement('div');
                card.className = 'update-card';
                
                // Color accent theme properties
                const typeClass = getTypeClass(up.type);
                let accentColor = 'var(--color-default)';
                if (typeClass === 'type-feature') accentColor = 'var(--color-feature)';
                else if (typeClass === 'type-announcement') accentColor = 'var(--color-announcement)';
                else if (typeClass === 'type-issue') accentColor = 'var(--color-issue)';
                else if (typeClass === 'type-breaking') accentColor = 'var(--color-breaking)';
                else if (typeClass === 'type-change') accentColor = 'var(--color-change)';
                
                card.style.setProperty('--card-accent', accentColor);
                
                // Card contents
                card.innerHTML = `
                    <div>
                        <div class="card-header">
                            <span class="type-badge ${typeClass}">${up.type}</span>
                        </div>
                        <div class="card-content">
                            ${up.body}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-icon btn-copy-link" title="Copy release link to clipboard" data-link="${release.link}">
                            <!-- Link Icon -->
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                        </button>
                        <button class="btn-tweet" data-date="${release.date}" data-type="${up.type}" data-snippet="${encodeURIComponent(up.snippet)}" data-link="${release.link}">
                            <!-- X Icon -->
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            <span>Tweet Update</span>
                        </button>
                    </div>
                `;
                
                cardsGrid.appendChild(card);
            });
            
            dayGroup.appendChild(cardsGrid);
            timelineFeed.appendChild(dayGroup);
        });

        // Set up event listeners on dynamically added cards
        setupCardEvents();
    }

    function setupCardEvents() {
        // Copy Link click handler
        document.querySelectorAll('.btn-copy-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = btn.getAttribute('data-link');
                copyToClipboard(link, 'Release link copied to clipboard!');
            });
        });

        // Tweet Update click handler
        document.querySelectorAll('.btn-tweet').forEach(btn => {
            btn.addEventListener('click', () => {
                const date = btn.getAttribute('data-date');
                const type = btn.getAttribute('data-type');
                const snippet = decodeURIComponent(btn.getAttribute('data-snippet'));
                const link = btn.getAttribute('data-link');

                openTweetComposer(date, type, snippet, link);
            });
        });
    }

    // Modal Composer Controller
    function openTweetComposer(date, type, snippet, link) {
        selectedUpdateData = { date, type, snippet, link };

        // Generate the default Tweet copy
        const header = `📢 BigQuery Update (${date})\n\n`;
        const typePrefix = `${type.toUpperCase()}: `;
        const footer = `\n\nRead more: ${link}`;
        const hashtags = `\n#BigQuery #GoogleCloud`;
        
        // Assemble text
        let draftText = `${header}${typePrefix}${snippet}${footer}${hashtags}`;
        
        // Set it inside textarea
        tweetTextarea.value = draftText;
        updateCharCount();
        
        // Open modal overlay
        tweetModal.classList.add('active');
        tweetTextarea.focus();
        // Place cursor at the end
        tweetTextarea.setSelectionRange(tweetTextarea.value.length, tweetTextarea.value.length);
    }

    function closeTweetComposer() {
        tweetModal.classList.remove('active');
        selectedUpdateData = null;
    }

    // Character Count and Verification Utility (accounting for Twitter link shortening)
    function calculateTwitterLength(text) {
        // Twitter treats any URL as 23 characters.
        // Let's replace URLs with a 23-character dummy to calculate exact length.
        const urlRegex = /https?:\/\/[^\s]+/g;
        let adjustedText = text.replace(urlRegex, 'x'.repeat(23));
        return adjustedText.length;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const twitterLength = calculateTwitterLength(text);
        
        charCounter.textContent = `${twitterLength} / 280`;
        
        // Remove old warnings
        charCounter.className = 'char-counter';
        
        // Apply coloring based on limits
        if (twitterLength >= 280) {
            charCounter.classList.add('danger');
            btnSendTweet.style.opacity = '0.5';
        } else if (twitterLength >= 240) {
            charCounter.classList.add('warning');
            btnSendTweet.style.opacity = '1';
        } else {
            btnSendTweet.style.opacity = '1';
        }
    }

    // Event listeners
    btnRefresh.addEventListener('click', () => fetchReleases(true));
    btnEmptyRetry.addEventListener('click', () => fetchReleases(true));
    
    // Modal controls
    btnCloseModal.addEventListener('click', closeTweetComposer);
    
    // Close modal on click outside content window
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Handle escape key closing modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetComposer();
        }
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    // Copy draft from Composer
    btnCopyTweet.addEventListener('click', () => {
        copyToClipboard(tweetTextarea.value, 'Tweet copy copied to clipboard!');
    });

    // Native tweet integration (Twitter Web Intent)
    btnSendTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const twitterLength = calculateTwitterLength(text);
        
        if (twitterLength > 280) {
            showToast('Post exceeds character limit! Please shorten it.', 'error');
            return;
        }

        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        closeTweetComposer();
        showToast('Redirected to X/Twitter web intent!', 'success');
    });

    // Initial load sequence
    fetchReleases();
});
