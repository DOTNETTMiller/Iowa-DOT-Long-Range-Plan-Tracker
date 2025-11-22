// Enhanced Interactive Popups for Major Construction Projects

// Create interactive popup content for a major project
function createMajorProjectPopup(feature, majorProjectId) {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const lat = coords[1];
    const lon = coords[0];

    // Container ID for this specific project
    const containerId = `major-project-${majorProjectId}`;

    return `
        <div id="${containerId}" class="major-project-popup" style="min-width: 350px; max-width: 450px; font-family: Inter, sans-serif;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #03617A 0%, #BBE2DA 100%); color: white; padding: 1rem; margin: -0.75rem -0.75rem 1rem -0.75rem; border-radius: 8px 8px 0 0;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 700; line-height: 1.3;">
                    ${escapeHtml(props.Project_Title)}
                </h3>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    ${props.District ? `<span style="background: rgba(255,255,255,0.3); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">District ${props.District}</span>` : ''}

                    <!-- Like Button -->
                    <button onclick="toggleMajorProjectLike(${majorProjectId}, '${containerId}')"
                            id="${containerId}-like-btn"
                            style="background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;">
                        <span id="${containerId}-like-icon">♡</span>
                        <span id="${containerId}-like-count">0</span>
                    </button>
                </div>
            </div>

            <!-- Project Number -->
            <div style="font-size: 0.7rem; color: #6b7280; background: #f9fafb; padding: 0.6rem; border-radius: 4px; margin-bottom: 0.75rem; font-family: monospace; word-break: break-all;">
                ${escapeHtml(props.Project_Number)}
            </div>

            <!-- Tabs -->
            <div style="display: flex; gap: 0.25rem; margin-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb;">
                <button onclick="switchMajorProjectTab('${containerId}', 'details')"
                        id="${containerId}-tab-details"
                        class="major-project-tab active"
                        style="flex: 1; background: #03617A; color: white; border: none; padding: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0;">
                    Details
                </button>
                <button onclick="switchMajorProjectTab('${containerId}', 'photos')"
                        id="${containerId}-tab-photos"
                        class="major-project-tab"
                        style="flex: 1; background: #e5e7eb; color: #6b7280; border: none; padding: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0;">
                    Photos (<span id="${containerId}-photo-count">0</span>)
                </button>
                <button onclick="switchMajorProjectTab('${containerId}', 'comments')"
                        id="${containerId}-tab-comments"
                        class="major-project-tab"
                        style="flex: 1; background: #e5e7eb; color: #6b7280; border: none; padding: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-radius: 4px 4px 0 0;">
                    Comments (<span id="${containerId}-comment-count">0</span>)
                </button>
            </div>

            <!-- Details Tab -->
            <div id="${containerId}-content-details" class="major-project-tab-content">
                <div style="font-size: 0.85rem; color: #374151; line-height: 1.5; margin-bottom: 0.75rem; max-height: 150px; overflow-y: auto;">
                    ${escapeHtml(props.Description)}
                </div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 0.75rem; font-size: 0.8rem; color: #6b7280; margin-bottom: 0.75rem;">
                    <strong style="color: #111827;">Start:</strong>
                    <span>${escapeHtml(props.Start_Date || 'N/A')}</span>
                    <strong style="color: #111827;">End:</strong>
                    <span>${escapeHtml(props.End_Date || 'N/A')}</span>
                    <strong style="color: #111827;">Contact:</strong>
                    <span>${escapeHtml(props.Contact_name)}<br/><a href="mailto:${escapeHtml(props.Contact_Email)}" style="color: #03617A; text-decoration: none;">${escapeHtml(props.Contact_Email)}</a></span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="https://511ia.org/map?layers=roadReports,weatherRadar,constructionReports&zoom=13&lat=${lat}&lon=${lon}" target="_blank"
                       style="flex: 1; background: #03617A; color: white; padding: 0.6rem; text-align: center; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 600;">
                        View on 511 Map
                    </a>
                </div>
            </div>

            <!-- Photos Tab -->
            <div id="${containerId}-content-photos" class="major-project-tab-content" style="display: none;">
                <div id="${containerId}-photos-list" style="max-height: 250px; overflow-y: auto;">
                    <p style="text-align: center; color: #9ca3af; padding: 1rem;">Loading photos...</p>
                </div>

                <!-- Photo Upload Form -->
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb;">
                    <form id="${containerId}-photo-form" onsubmit="uploadMajorProjectPhoto(event, ${majorProjectId}, '${containerId}')" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <input type="file" name="photo" accept="image/*" required
                               style="font-size: 0.75rem; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px;">
                        <input type="text" name="caption" placeholder="Add a caption (optional)"
                               style="font-size: 0.75rem; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px;">
                        <button type="submit"
                                style="background: #03617A; color: white; border: none; padding: 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Upload Photo
                        </button>
                    </form>
                </div>
            </div>

            <!-- Comments Tab -->
            <div id="${containerId}-content-comments" class="major-project-tab-content" style="display: none;">
                <div id="${containerId}-comments-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 0.75rem;">
                    <p style="text-align: center; color: #9ca3af; padding: 1rem;">Loading comments...</p>
                </div>

                <!-- Comment Form -->
                <form id="${containerId}-comment-form" onsubmit="postMajorProjectComment(event, ${majorProjectId}, '${containerId}')"
                      style="display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb;">
                    <input type="text" name="display_name" placeholder="Your name" required
                           style="font-size: 0.75rem; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px;">
                    <textarea name="comment_text" placeholder="Add a comment..." required rows="2"
                              style="font-size: 0.75rem; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>
                    <button type="submit"
                            style="background: #03617A; color: white; border: none; padding: 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                        Post Comment
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Switch between tabs in the popup
function switchMajorProjectTab(containerId, tabName) {
    // Update tab buttons
    ['details', 'photos', 'comments'].forEach(tab => {
        const btn = document.getElementById(`${containerId}-tab-${tab}`);
        const content = document.getElementById(`${containerId}-content-${tab}`);

        if (tab === tabName) {
            btn.style.background = '#03617A';
            btn.style.color = 'white';
            content.style.display = 'block';

            // Load data when tab is opened
            if (tab === 'photos' && !content.dataset.loaded) {
                loadMajorProjectPhotos(containerId);
                content.dataset.loaded = 'true';
            } else if (tab === 'comments' && !content.dataset.loaded) {
                loadMajorProjectComments(containerId);
                content.dataset.loaded = 'true';
            }
        } else {
            btn.style.background = '#e5e7eb';
            btn.style.color = '#6b7280';
            content.style.display = 'none';
        }
    });
}

// Load project data and initialize popup
async function initializeMajorProjectPopup(containerId, majorProjectId) {
    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}`);
        const result = await response.json();

        if (result.success) {
            const project = result.data;

            // Update counts
            document.getElementById(`${containerId}-comment-count`).textContent = project.comment_count || 0;
            document.getElementById(`${containerId}-photo-count`).textContent = project.photo_count || 0;
            document.getElementById(`${containerId}-like-count`).textContent = project.like_count || 0;
        }
    } catch (err) {
        console.error('Error loading project data:', err);
    }
}

// Load photos for a project
async function loadMajorProjectPhotos(containerId) {
    const majorProjectId = containerId.replace('major-project-', '');
    const photosList = document.getElementById(`${containerId}-photos-list`);

    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}/photos`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            photosList.innerHTML = result.data.map(photo => `
                <div style="margin-bottom: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.5rem;">
                    <img src="${photo.photo_url}" alt="${photo.caption || 'Project photo'}"
                         style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 0.5rem;">
                    ${photo.caption ? `<p style="font-size: 0.8rem; color: #374151; margin: 0 0 0.25rem 0;">${escapeHtml(photo.caption)}</p>` : ''}
                    <p style="font-size: 0.7rem; color: #9ca3af; margin: 0;">
                        By ${escapeHtml(photo.display_name)} • ${new Date(photo.upload_date).toLocaleDateString()}
                    </p>
                </div>
            `).join('');
        } else {
            photosList.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 1rem;">No photos yet. Be the first to upload!</p>';
        }
    } catch (err) {
        console.error('Error loading photos:', err);
        photosList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 1rem;">Failed to load photos</p>';
    }
}

// Load comments for a project
async function loadMajorProjectComments(containerId) {
    const majorProjectId = containerId.replace('major-project-', '');
    const commentsList = document.getElementById(`${containerId}-comments-list`);

    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}/comments`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            commentsList.innerHTML = result.data.map(comment => `
                <div style="margin-bottom: 0.75rem; padding: 0.6rem; background: #f9fafb; border-radius: 6px; border-left: 3px solid #03617A;">
                    <p style="font-size: 0.85rem; color: #374151; margin: 0 0 0.3rem 0; line-height: 1.4;">
                        ${escapeHtml(comment.comment_text)}
                    </p>
                    <p style="font-size: 0.7rem; color: #9ca3af; margin: 0;">
                        <strong>${escapeHtml(comment.display_name)}</strong> • ${new Date(comment.created_at).toLocaleDateString()}
                    </p>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 1rem;">No comments yet. Be the first to comment!</p>';
        }
    } catch (err) {
        console.error('Error loading comments:', err);
        commentsList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 1rem;">Failed to load comments</p>';
    }
}

// Post a new comment
async function postMajorProjectComment(event, majorProjectId, containerId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: formData.get('display_name'),
                comment_text: formData.get('comment_text')
            })
        });

        const result = await response.json();

        if (result.success) {
            form.reset();
            // Reload comments
            document.getElementById(`${containerId}-content-comments`).dataset.loaded = 'false';
            loadMajorProjectComments(containerId);

            // Update comment count
            const countEl = document.getElementById(`${containerId}-comment-count`);
            countEl.textContent = parseInt(countEl.textContent) + 1;
        } else {
            alert('Failed to post comment: ' + result.error);
        }
    } catch (err) {
        console.error('Error posting comment:', err);
        alert('Failed to post comment');
    }
}

// Upload a photo
async function uploadMajorProjectPhoto(event, majorProjectId, containerId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('user_id', 1); // Default user

    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}/photos`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Photo uploaded successfully!');
            form.reset();

            // Reload photos to show the new upload
            const photosContent = document.getElementById(`${containerId}-content-photos`);
            photosContent.dataset.loaded = 'false';
            loadMajorProjectPhotos(containerId);

            // Update photo count
            const countEl = document.getElementById(`${containerId}-photo-count`);
            countEl.textContent = parseInt(countEl.textContent) + 1;
        } else {
            alert('Failed to upload photo: ' + result.error);
        }
    } catch (err) {
        console.error('Error uploading photo:', err);
        alert('Failed to upload photo');
    }
}

// Toggle like on a project
async function toggleMajorProjectLike(majorProjectId, containerId) {
    try {
        const response = await fetch(`/api/major-projects/${majorProjectId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 }) // Default user
        });

        const result = await response.json();

        if (result.success) {
            const icon = document.getElementById(`${containerId}-like-icon`);
            const count = document.getElementById(`${containerId}-like-count`);

            if (result.liked) {
                icon.textContent = '♥';
                count.textContent = parseInt(count.textContent) + 1;
            } else {
                icon.textContent = '♡';
                count.textContent = parseInt(count.textContent) - 1;
            }
        }
    } catch (err) {
        console.error('Error toggling like:', err);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to global scope
window.switchMajorProjectTab = switchMajorProjectTab;
window.toggleMajorProjectLike = toggleMajorProjectLike;
window.postMajorProjectComment = postMajorProjectComment;
window.uploadMajorProjectPhoto = uploadMajorProjectPhoto;
window.createMajorProjectPopup = createMajorProjectPopup;
window.initializeMajorProjectPopup = initializeMajorProjectPopup;
