// ============================================================================
// Data Model & Schema
// ============================================================================

const DOTS_SCHEMA = {
    format: 'gigbox-setlists',
    version: 6,
    requiredFields: {
        root: ['format', 'version', 'exportedAt', 'groups', 'songs', 'setlists'],
        setlist: ['name', 'group', 'items'],
        song: ['title'],
        item: ['type', 'title']
    }
};

class DotsData {
    constructor() {
        this.format = DOTS_SCHEMA.format;
        this.version = DOTS_SCHEMA.version;
        this.exportedAt = new Date().toISOString();
        this.groups = [];
        this.songs = [];
        this.setlists = [];
    }

    static fromJSON(json) {
        const data = new DotsData();
        if (json.format) data.format = json.format;
        if (json.version) data.version = json.version;
        if (json.exportedAt) data.exportedAt = json.exportedAt;
        if (json.groups) data.groups = JSON.parse(JSON.stringify(json.groups));
        if (json.songs) data.songs = JSON.parse(JSON.stringify(json.songs));
        if (json.setlists) data.setlists = JSON.parse(JSON.stringify(json.setlists));
        return data;
    }

    toJSON() {
        return {
            format: this.format,
            version: this.version,
            exportedAt: new Date().toISOString(),
            groups: this.groups,
            songs: this.songs,
            setlists: this.setlists
        };
    }

    validate() {
        const errors = [];

        if (!this.format || this.format !== DOTS_SCHEMA.format) {
            errors.push(`Invalid format. Expected '${DOTS_SCHEMA.format}'`);
        }
        if (!this.version || this.version < 6) {
            errors.push(`Invalid version. Minimum version is 6`);
        }
        if (!this.setlists || this.setlists.length === 0) {
            errors.push('At least one setlist is required');
        }

        this.setlists.forEach((setlist, idx) => {
            if (!setlist.name) errors.push(`Setlist ${idx}: Missing name`);
            if (!setlist.group) errors.push(`Setlist ${idx}: Missing group`);
            if (!setlist.items || setlist.items.length === 0) {
                errors.push(`Setlist ${idx}: At least one item is required`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// ============================================================================
// Application State & Manager
// ============================================================================

class AppState {
    constructor() {
        this.data = new DotsData();
        this.currentTab = 'setlists';
        this.editingItem = null;
        this.editingItemType = null;
    }

    addSetlist(setlist = {}) {
        const newSetlist = {
            name: setlist.name || 'New Setlist',
            group: setlist.group || (this.data.groups[0] || 'Default Group'),
            location: setlist.location || '',
            latitude: setlist.latitude || null,
            longitude: setlist.longitude || null,
            date: setlist.date || new Date().toISOString().split('T')[0],
            time: setlist.time || '19:00',
            items: setlist.items || []
        };
        this.data.setlists.push(newSetlist);
        return newSetlist;
    }

    addSong(song = {}) {
        const newSong = {
            title: song.title || 'New Song',
            notes_raw_text: song.notes_raw_text || '',
            cue_document: song.cue_document || { version: 1, blocks: [] }
        };
        this.data.songs.push(newSong);
        return newSong;
    }

    addGroup(groupName = 'New Group') {
        if (!this.data.groups.includes(groupName)) {
            this.data.groups.push(groupName);
        }
        return groupName;
    }

    addSongToSetlist(setlistIdx, song) {
        if (setlistIdx < 0 || setlistIdx >= this.data.setlists.length) return;
        this.data.setlists[setlistIdx].items.push({
            type: 'song',
            title: song.title || 'Song',
            notes_raw_text: song.notes_raw_text || '',
            cue_document: { version: 1, blocks: [] }
        });
    }

    updateSetlist(idx, updates) {
        if (idx >= 0 && idx < this.data.setlists.length) {
            Object.assign(this.data.setlists[idx], updates);
        }
    }

    updateSong(idx, updates) {
        if (idx >= 0 && idx < this.data.songs.length) {
            Object.assign(this.data.songs[idx], updates);
        }
    }

    removeSetlist(idx) {
        this.data.setlists.splice(idx, 1);
    }

    removeSong(idx) {
        this.data.songs.splice(idx, 1);
    }

    removeSetlistItem(setlistIdx, itemIdx) {
        if (setlistIdx >= 0 && setlistIdx < this.data.setlists.length) {
            this.data.setlists[setlistIdx].items.splice(itemIdx, 1);
        }
    }

    removeGroup(groupName) {
        const idx = this.data.groups.indexOf(groupName);
        if (idx >= 0) {
            this.data.groups.splice(idx, 1);
        }
    }

    clear() {
        this.data = new DotsData();
        this.editingItem = null;
        this.editingItemType = null;
    }
}

// ============================================================================
// UI Manager
// ============================================================================

class UIManager {
    constructor(state) {
        this.state = state;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Import/Clear
        document.getElementById('importBtn').addEventListener('click', () => this.handleImport());
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelected(e));

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add buttons
        document.getElementById('addSetlistBtn').addEventListener('click', () => this.addSetlist());
        document.getElementById('addSongBtn').addEventListener('click', () => this.addSong());
        document.getElementById('addGroupBtn').addEventListener('click', () => this.addGroup());

        // Export buttons
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadJSON());

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalSaveBtn').addEventListener('click', () => this.saveFromModal());

        // Click outside modal to close
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeModal();
        });
    }

    handleImport() {
        document.getElementById('fileInput').click();
    }

    handleFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                this.state.data = DotsData.fromJSON(json);
                this.updateUI();
                this.updatePreview();
            } catch (error) {
                alert('Error parsing JSON: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    }

    handleClear() {
        if (confirm('Are you sure you want to clear all data?')) {
            this.state.clear();
            this.updateUI();
            this.updatePreview();
        }
    }

    switchTab(tabName) {
        this.state.currentTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    addSetlist() {
        this.state.addSetlist();
        this.renderSetlists();
        this.updatePreview();
    }

    addSong() {
        this.state.addSong();
        this.renderSongs();
        this.updatePreview();
    }

    addGroup() {
        const groupName = prompt('Enter group name:');
        if (groupName && groupName.trim()) {
            this.state.addGroup(groupName.trim());
            this.renderGroups();
            this.updatePreview();
        }
    }

    editSetlist(idx) {
        this.state.editingItem = idx;
        this.state.editingItemType = 'setlist';
        this.showSetlistEditModal(idx);
    }

    editSong(idx) {
        this.state.editingItem = idx;
        this.state.editingItemType = 'song';
        this.showSongEditModal(idx);
    }

    editGroup(groupName) {
        this.state.editingItem = groupName;
        this.state.editingItemType = 'group';
        this.showGroupEditModal(groupName);
    }

    showSetlistEditModal(idx) {
        const setlist = this.state.data.setlists[idx];
        const modalBody = document.getElementById('modalBody');
        const groupOptions = this.state.data.groups.map(g => `<option value="${g}" ${g === setlist.group ? 'selected' : ''}>${g}</option>`).join('');

        modalBody.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="setlistName" value="${setlist.name}" />
            </div>
            <div class="form-group">
                <label>Group</label>
                <select id="setlistGroup">
                    ${groupOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Location</label>
                <input type="text" id="setlistLocation" value="${setlist.location || ''}" />
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" id="setlistDate" value="${setlist.date || ''}" />
            </div>
            <div class="form-group">
                <label>Time</label>
                <input type="time" id="setlistTime" value="${setlist.time || '19:00'}" />
            </div>
            <div class="form-group">
                <label>Songs in Setlist</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${setlist.items.map((item, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; border-radius: 4px;">
                            <span>${item.title}</span>
                            <button type="button" class="btn btn-danger" onclick="app.removeSetlistItem(${idx}, ${i})">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-primary" style="margin-top: 10px;" onclick="app.addSongToSetlist(${idx})">+ Add Song</button>
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Edit Setlist';
        document.getElementById('editModal').classList.remove('hidden');
    }

    showSongEditModal(idx) {
        const song = this.state.data.songs[idx];
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="songTitle" value="${song.title}" />
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="songNotes">${song.notes_raw_text || ''}</textarea>
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Edit Song';
        document.getElementById('editModal').classList.remove('hidden');
    }

    showGroupEditModal(groupName) {
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div class="form-group">
                <label>Group Name</label>
                <input type="text" id="groupName" value="${groupName}" />
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Edit Group';
        document.getElementById('editModal').classList.remove('hidden');
    }

    saveFromModal() {
        const itemType = this.state.editingItemType;

        if (itemType === 'setlist') {
            const idx = this.state.editingItem;
            this.state.updateSetlist(idx, {
                name: document.getElementById('setlistName').value,
                group: document.getElementById('setlistGroup').value,
                location: document.getElementById('setlistLocation').value,
                date: document.getElementById('setlistDate').value,
                time: document.getElementById('setlistTime').value
            });
            this.renderSetlists();
        } else if (itemType === 'song') {
            const idx = this.state.editingItem;
            this.state.updateSong(idx, {
                title: document.getElementById('songTitle').value,
                notes_raw_text: document.getElementById('songNotes').value
            });
            this.renderSongs();
        } else if (itemType === 'group') {
            const oldName = this.state.editingItem;
            const newName = document.getElementById('groupName').value;
            if (oldName !== newName) {
                const idx = this.state.data.groups.indexOf(oldName);
                if (idx >= 0) {
                    this.state.data.groups[idx] = newName;
                    // Update references in setlists
                    this.state.data.setlists.forEach(s => {
                        if (s.group === oldName) s.group = newName;
                    });
                }
            }
            this.renderGroups();
        }

        this.closeModal();
        this.updatePreview();
    }

    closeModal() {
        document.getElementById('editModal').classList.add('hidden');
        this.state.editingItem = null;
        this.state.editingItemType = null;
    }

    removeSetlistItem(setlistIdx, itemIdx) {
        this.state.removeSetlistItem(setlistIdx, itemIdx);
        this.updatePreview();
        // Refresh the modal
        this.editSetlist(setlistIdx);
    }

    addSongToSetlist(setlistIdx) {
        if (this.state.data.songs.length === 0) {
            alert('No songs available. Add a song first.');
            return;
        }

        const songTitle = prompt('Enter song title or select from existing:');
        if (songTitle) {
            const song = this.state.data.songs.find(s => s.title === songTitle);
            if (song) {
                this.state.addSongToSetlist(setlistIdx, song);
            } else {
                this.state.addSongToSetlist(setlistIdx, { title: songTitle });
            }
            this.updatePreview();
            this.editSetlist(setlistIdx);
        }
    }

    renderSetlists() {
        const container = document.getElementById('setlistsList');
        container.innerHTML = this.state.data.setlists.map((setlist, idx) => `
            <button class="item-btn" onclick="app.ui.editSetlist(${idx})">
                📋 ${setlist.name} (${setlist.group}) - ${setlist.date}
            </button>
            <button class="btn btn-danger" style="width: 100%; margin-bottom: 8px;" onclick="app.removeSetlist(${idx})">Delete</button>
        `).join('');

        if (this.state.data.setlists.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No setlists. Click "+ Add Setlist" to create one.</p>';
        }
    }

    renderSongs() {
        const container = document.getElementById('songsList');
        container.innerHTML = this.state.data.songs.map((song, idx) => `
            <button class="item-btn" onclick="app.ui.editSong(${idx})">
                🎵 ${song.title}
            </button>
            <button class="btn btn-danger" style="width: 100%; margin-bottom: 8px;" onclick="app.removeSong(${idx})">Delete</button>
        `).join('');

        if (this.state.data.songs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No songs. Click "+ Add Song" to create one.</p>';
        }
    }

    renderGroups() {
        const container = document.getElementById('groupsList');
        container.innerHTML = this.state.data.groups.map((group) => `
            <button class="item-btn" onclick="app.ui.editGroup('${group}')">
                👥 ${group}
            </button>
            <button class="btn btn-danger" style="width: 100%; margin-bottom: 8px;" onclick="app.removeGroup('${group}')">Delete</button>
        `).join('');

        if (this.state.data.groups.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No groups. Click "+ Add Group" to create one.</p>';
        }
    }

    removeSetlist(idx) {
        if (confirm('Delete this setlist?')) {
            this.state.removeSetlist(idx);
            this.renderSetlists();
            this.updatePreview();
        }
    }

    removeSong(idx) {
        if (confirm('Delete this song?')) {
            this.state.removeSong(idx);
            this.renderSongs();
            this.updatePreview();
        }
    }

    removeGroup(groupName) {
        if (confirm(`Delete group "${groupName}"? Setlists using this group will be updated.`)) {
            this.state.removeGroup(groupName);
            this.renderGroups();
            this.updatePreview();
        }
    }

    updateUI() {
        const isEmpty = this.state.data.setlists.length === 0 && this.state.data.songs.length === 0;
        document.getElementById('noData').classList.toggle('hidden', !isEmpty);
        document.getElementById('editor').classList.toggle('hidden', isEmpty);

        if (!isEmpty) {
            this.renderSetlists();
            this.renderSongs();
            this.renderGroups();
        }
    }

    updatePreview() {
        const json = this.state.data.toJSON();
        const validation = this.state.data.validate();

        // Update preview
        document.getElementById('jsonPreview').textContent = JSON.stringify(json, null, 2);

        // Update validation status
        const statusEl = document.getElementById('validationStatus');
        if (validation.isValid) {
            statusEl.className = 'validation-status valid';
            statusEl.textContent = '✓ Valid dots JSON (v' + json.version + ')';
        } else {
            statusEl.className = 'validation-status invalid';
            statusEl.textContent = '✗ Validation errors: ' + validation.errors.join('; ');
        }

        // Enable/disable export buttons
        const hasData = json.setlists.length > 0;
        document.getElementById('copyBtn').disabled = !hasData;
        document.getElementById('downloadBtn').disabled = !hasData;
    }

    copyToClipboard() {
        const json = JSON.stringify(this.state.data.toJSON(), null, 2);
        navigator.clipboard.writeText(json).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(() => {
            alert('Failed to copy. Please try again.');
        });
    }

    downloadJSON() {
        const json = JSON.stringify(this.state.data.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dots-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ============================================================================
// Application Initialization
// ============================================================================

class App {
    constructor() {
        this.state = new AppState();
        this.ui = new UIManager(this.state);
        this.ui.updateUI();
        this.ui.updatePreview();
    }

    // Expose state management methods for inline onclick handlers
    removeSetlist(idx) {
        this.ui.removeSetlist(idx);
    }

    removeSong(idx) {
        this.ui.removeSong(idx);
    }

    removeGroup(groupName) {
        this.ui.removeGroup(groupName);
    }

    removeSetlistItem(setlistIdx, itemIdx) {
        this.ui.removeSetlistItem(setlistIdx, itemIdx);
    }

    addSongToSetlist(setlistIdx) {
        this.ui.addSongToSetlist(setlistIdx);
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
