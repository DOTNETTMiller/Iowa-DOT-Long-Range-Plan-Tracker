// Iowa DOT Interactive Tracker - Frontend JavaScript
// Handles all API interactions and interactive features

const API_BASE = window.location.origin + '/api';

// ============================================
// USER SESSION MANAGEMENT
// ============================================

let currentUser = null;

function initUserSession() {
    // Check if user exists in localStorage
    const storedUser = localStorage.getItem('iowaDOTUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUIForUser();
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loginUser(username, displayName, email) {
    try {
        const response = await fetch(`${API_BASE}/users/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, display_name: displayName, email })
        });

        const result = await response.json();
        if (result.success) {
            currentUser = result.data;
            localStorage.setItem('iowaDOTUser', JSON.stringify(currentUser));
            hideLoginModal();
            updateUIForUser();
            showNotification('Welcome, ' + currentUser.display_name + '!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
    return false;
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('iowaDOTUser');
    updateUIForUser();
    showNotification('Logged out successfully', 'info');
}

function updateUIForUser() {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        if (currentUser) {
            userInfo.innerHTML = `
                <span>👤 ${currentUser.display_name}</span>
                <button onclick="logoutUser()" class="logout-btn">Logout</button>
            `;
        } else {
            userInfo.innerHTML = '<button onclick="showLoginModal()" class="login-btn">Login</button>';
        }
    }
}

// ============================================
// PROJECT API CALLS
// ============================================

async function fetchProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

async function fetchProjectDetails(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error fetching project details:', error);
        return null;
    }
}

async function submitNewProject(projectData) {
    if (!currentUser) {
        showNotification('Please login to submit a project', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...projectData, user_id: currentUser.id })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Project submitted for approval!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error submitting project:', error);
        showNotification('Failed to submit project', 'error');
    }
    return false;
}

async function updateProjectStatus(projectId, status, completion, note) {
    if (!currentUser) {
        showNotification('Please login to update status', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status,
                completion_percentage: completion,
                update_note: note,
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Status updated successfully!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Failed to update status', 'error');
    }
    return false;
}

// ============================================
// COMMENTS API CALLS
// ============================================

async function fetchComments(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/comments`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}

async function postComment(projectId, commentText) {
    if (!currentUser) {
        showNotification('Please login to comment', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment_text: commentText,
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Comment added!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        showNotification('Failed to post comment', 'error');
    }
    return false;
}

// ============================================
// LIKES API CALLS
// ============================================

async function toggleLike(projectId) {
    if (!currentUser) {
        showNotification('Please login to like projects', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });

        const result = await response.json();
        if (result.success) {
            return result.liked;
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
    return null;
}

// ============================================
// LINKS API CALLS
// ============================================

async function fetchProjectLinks(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/links`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error fetching links:', error);
        return [];
    }
}

async function addProjectLink(projectId, linkUrl, linkTitle, linkDescription) {
    if (!currentUser) {
        showNotification('Please login to add links', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                link_url: linkUrl,
                link_title: linkTitle,
                link_description: linkDescription,
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Link added!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error adding link:', error);
        showNotification('Failed to add link', 'error');
    }
    return false;
}

async function updateProjectLink(projectId, linkId, linkUrl, linkTitle, linkDescription) {
    if (!currentUser) {
        showNotification('Please login to edit links', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/links/${linkId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                link_url: linkUrl,
                link_title: linkTitle,
                link_description: linkDescription,
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Link updated!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error updating link:', error);
        showNotification('Failed to update link', 'error');
    }
    return false;
}

async function deleteProjectLink(projectId, linkId) {
    if (!currentUser) {
        showNotification('Please login to delete links', 'error');
        return false;
    }

    if (!confirm('Are you sure you want to delete this link?')) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/links/${linkId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Link deleted!', 'success');
            return true;
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showNotification('Failed to delete link', 'error');
    }
    return false;
}

// ============================================
// HISTORY API CALLS
// ============================================

async function fetchProjectHistory(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/history`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
}

// ============================================
// METRICS API CALLS
// ============================================

async function fetchMetrics() {
    try {
        const response = await fetch(`${API_BASE}/metrics`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return null;
    }
}

// ============================================
// ACTIVITY FEED API CALLS
// ============================================

async function fetchActivityFeed(limit = 20) {
    try {
        const response = await fetch(`${API_BASE}/activity?limit=${limit}`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error fetching activity:', error);
        return [];
    }
}

// ============================================
// UI HELPERS
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString();
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.IowaDOTTracker = {
    // User functions
    initUserSession,
    loginUser,
    logoutUser,
    showLoginModal,
    getCurrentUser: () => currentUser,

    // Project functions
    fetchProjects,
    fetchProjectDetails,
    submitNewProject,
    updateProjectStatus,

    // Comment functions
    fetchComments,
    postComment,

    // Like functions
    toggleLike,

    // Link functions
    fetchProjectLinks,
    addProjectLink,
    updateProjectLink,
    deleteProjectLink,

    // History functions
    fetchProjectHistory,

    // Metrics functions
    fetchMetrics,

    // Activity functions
    fetchActivityFeed,

    // UI helpers
    showNotification,
    formatDate
};

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserSession);
} else {
    initUserSession();
}
