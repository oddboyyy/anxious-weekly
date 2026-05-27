let thoughts = [];

const API_URL = '/api';

async function fetchThoughts() {
    try {
        const response = await fetch(`${API_URL}/thoughts`);
        thoughts = await response.json();
        renderThoughts();
    } catch (error) {
        console.error('Failed to fetch thoughts:', error);
    }
}

function renderThoughts() {
    const container = document.getElementById('thoughtsContainer');
    
    if (thoughts.length === 0) {
        container.innerHTML = '<p class="no-thoughts">还没有想法，来分享你的心声吧 ✨</p>';
        return;
    }
    
    container.innerHTML = thoughts.map(thought => `
        <div class="thought-card" data-id="${thought.id}">
            <div class="thought-header">
                <span class="thought-author">${thought.author}</span>
                <span class="thought-time">${thought.time}</span>
            </div>
            <p class="thought-content">${thought.content}</p>
            <div class="thought-actions">
                <button class="action-btn" onclick="toggleLike(${thought.id})">
                    <span>❤️</span>
                    <span>${thought.likes}</span>
                </button>
                <button class="action-btn" onclick="toggleComments(${thought.id})">
                    <span>💬</span>
                    <span>${thought.comments.length}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${thought.id}" style="display: none;">
                <input 
                    type="text" 
                    class="comment-input" 
                    placeholder="写下你的留言..." 
                    onkeyup="handleCommentKeyup(event, ${thought.id})"
                />
                <div class="comment-list" id="comment-list-${thought.id}">
                    ${thought.comments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-author">${comment.author}</div>
                            <div class="comment-content">${comment.content}</div>
                            <div class="comment-time">${comment.time}</div>
                        </div>
                    `).join('')}
                    ${thought.comments.length === 0 ? '<p style="color: #999; font-size: 0.9rem;">还没有留言，来发表第一条吧！</p>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleLike(thoughtId) {
    try {
        const response = await fetch(`${API_URL}/thoughts/${thoughtId}/like`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            const thought = thoughts.find(t => t.id === thoughtId);
            if (thought) {
                thought.likes = data.likes;
                renderThoughts();
            }
        }
    } catch (error) {
        console.error('Failed to like thought:', error);
    }
}

function toggleComments(thoughtId) {
    const commentsSection = document.getElementById(`comments-${thoughtId}`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
}

function handleCommentKeyup(event, thoughtId) {
    if (event.key === 'Enter' && event.target.value.trim()) {
        addComment(thoughtId, event.target.value);
        event.target.value = '';
    }
}

async function addComment(thoughtId, content) {
    try {
        const response = await fetch(`${API_URL}/thoughts/${thoughtId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                author: '访客',
                content: content
            })
        });
        
        if (response.ok) {
            const newComment = await response.json();
            const thought = thoughts.find(t => t.id === thoughtId);
            if (thought) {
                thought.comments.push(newComment);
                renderThoughts();
                
                setTimeout(() => {
                    const commentsSection = document.getElementById(`comments-${thoughtId}`);
                    if (commentsSection) {
                        commentsSection.style.display = 'block';
                    }
                }, 100);
            }
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
    }
}

document.getElementById('thoughtForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const author = document.getElementById('thoughtAuthor').value;
    const content = document.getElementById('thoughtContent').value;
    
    try {
        const response = await fetch(`${API_URL}/thoughts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                author: author,
                content: content
            })
        });
        
        if (response.ok) {
            const newThought = await response.json();
            thoughts.unshift(newThought);
            renderThoughts();
            
            document.getElementById('thoughtAuthor').value = '';
            document.getElementById('thoughtContent').value = '';
        }
    } catch (error) {
        console.error('Failed to create thought:', error);
    }
});

document.addEventListener('DOMContentLoaded', fetchThoughts);