document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // CUSTOM TOAST NOTIFICATION NOTIFIERS
    // ==========================================
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <span>${icon}</span>
            <div>${message}</div>
        `;
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('active'), 50);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Override browser window.alert to route to custom toasts automatically!
    window.alert = function(message) {
        let type = 'info';
        const lower = message.toLowerCase();
        if (lower.includes('success') || lower.includes('complete') || lower.includes('committed') || lower.includes('broadcasted') || lower.includes('healthy') || lower.includes('saved') || lower.includes('assigned') || lower.includes('sent')) {
            type = 'success';
        } else if (lower.includes('failed') || lower.includes('denied') || lower.includes('invalid') || lower.includes('error') || lower.includes('cannot') || lower.includes('must') || lower.includes('aborted') || lower.includes('wrong')) {
            type = 'error';
        } else if (lower.includes('warning') || lower.includes('attention') || lower.includes('blocker') || lower.includes('prevented') || lower.includes('de-activated') || lower.includes('deactivated')) {
            type = 'warning';
        }
        showToast(message, type);
    };

    // 1. Session & Auth Verification Check
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please login first to access the dashboard.');
        window.location.href = 'login.html';
        return;
    }

    // Set dynamic date in topbar
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    // Update Header and Profile with Logged-in User Data
    const greetingName = document.querySelector('.welcome-msg h3');
    if (greetingName) greetingName.textContent = currentUser.fullName;
    
    const roleBadge = document.querySelector('.welcome-msg .role-badge');
    if (roleBadge) roleBadge.textContent = currentUser.role;

    const topBarAvatar = document.querySelector('.top-bar-right .avatar');
    if (topBarAvatar) topBarAvatar.textContent = currentUser.fullName.charAt(0);

    const profileAvatar = document.querySelector('.profile-large-avatar');
    if (profileAvatar) profileAvatar.textContent = currentUser.fullName.charAt(0);

    const profileName = document.querySelector('.profile-card h2');
    if (profileName) profileName.textContent = currentUser.fullName;

    const profileRoleBadge = document.querySelector('.profile-card .badge');
    if (profileRoleBadge) profileRoleBadge.textContent = currentUser.role;

    const profileInfoValues = document.querySelectorAll('#view-profile .info-row .value');
    if (profileInfoValues.length >= 4) {
        profileInfoValues[0].textContent = currentUser.id || 'GS-SUP-104';
        profileInfoValues[1].textContent = currentUser.email;
        profileInfoValues[2].textContent = currentUser.mobile;
        profileInfoValues[3].textContent = `${currentUser.city || ''}, ${currentUser.state || ''}`;
    }

    // Logout Functionality
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    });

    // 2. Single Page Router Logic
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pageViews = document.querySelectorAll('.page-view');

    function switchView(viewId) {
        // Hide all views
        pageViews.forEach(view => view.classList.remove('active'));
        
        // Remove active class from navs
        navItems.forEach(item => item.classList.remove('active'));
        
        // Show target view
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.add('active');
        
        // Add active to nav
        const activeNav = document.querySelector(`.sidebar-nav .nav-item[data-target="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Trigger Google Map rendering
        if (viewId === 'centers') {
            renderGISMap();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (target) {
                switchView(target);
                window.location.hash = target;
            }
        });
    });

    // Check URL hash on load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`view-${initialHash}`)) {
        switchView(initialHash);
    } else {
        switchView('home'); // Default to home view
    }

    // 3. Dynamic Rendering & Business Logic

    // A. Teacher Monitoring Section
    const teacherDrawer = document.getElementById('teacher-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerName = document.getElementById('drawer-name');
    const drawerCenter = document.getElementById('drawer-center');
    const drawerAvatar = document.getElementById('drawer-avatar');

    function openDrawer(name, center, qual, exp, subjs) {
        if(drawerName) drawerName.textContent = name;
        if(drawerCenter) drawerCenter.textContent = center;
        if(drawerAvatar) drawerAvatar.textContent = name.charAt(0);
        
        const drawerSubjects = document.querySelector('#teacher-drawer .detail-box:nth-child(1) .value');
        const drawerExperience = document.querySelector('#teacher-drawer .detail-box:nth-child(2) .value');
        if (drawerSubjects) drawerSubjects.textContent = subjs || 'Not Specified';
        if (drawerExperience) drawerExperience.textContent = exp ? `${exp} Years` : 'Not Specified';

        if(teacherDrawer) teacherDrawer.classList.add('open');
        if(drawerOverlay) drawerOverlay.classList.add('open');
    }

    function closeDrawer() {
        if(teacherDrawer) teacherDrawer.classList.remove('open');
        if(drawerOverlay) drawerOverlay.classList.remove('open');
    }

    if(closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if(drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    function renderTeachers() {
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const teachers = allUsers.filter(u => u.role === 'teacher');
        const tbody = document.querySelector('#view-teachers tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">No teachers registered yet.</td></tr>';
        } else {
            teachers.forEach(t => {
                const tr = document.createElement('tr');
                tr.className = 'teacher-row';
                tr.innerHTML = `
                    <td class="flex-start"><div class="avatar-small">${t.fullName.charAt(0)}</div><strong>${t.fullName}</strong></td>
                    <td>${t.pref_center || 'Not Assigned'}</td>
                    <td><span class="text-success">96%</span></td>
                    <td>${t.experience ? t.experience * 12 : 24}</td>
                    <td>2 hours ago</td>
                    <td>9.0 / 10</td>
                    <td><button class="icon-btn"><span class="material-symbols-rounded">visibility</span></button></td>
                `;
                tr.addEventListener('click', () => {
                    openDrawer(t.fullName, t.pref_center || 'Not Assigned', t.qualification, t.experience, t.subjects);
                });
                tbody.appendChild(tr);
            });
        }
        
        // Update home stats
        const teacherStatCard = document.querySelector('.grid-stats .stat-card:nth-child(2) h3');
        if (teacherStatCard) teacherStatCard.textContent = teachers.length;

        const uniqueCenters = [...new Set(teachers.map(t => t.pref_center).filter(Boolean))];
        const centerStatCard = document.querySelector('.grid-stats .stat-card:nth-child(1) h3');
        if (centerStatCard) centerStatCard.textContent = uniqueCenters.length;
    }

    // B. Student Overview Section
    function renderStudents() {
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const tbody = document.querySelector('#view-students tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px;">No students added yet. Click "Add Student" to create one.</td></tr>';
        } else {
            students.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.roll}</td>
                    <td>${s.center}</td>
                    <td><span class="${parseFloat(s.attendance) < 75 ? 'text-danger' : 'text-success'}">${s.attendance}</span></td>
                    <td>${s.guardian}</td>
                    <td><span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}">${s.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update home stats
        const studentStatCard = document.querySelector('.grid-stats .stat-card:nth-child(3) h3');
        if (studentStatCard) studentStatCard.textContent = students.length;
    }

    const addStudentBtn = document.querySelector('#view-students .btn-primary');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            const name = prompt("Enter Student Full Name:");
            if (!name) return;
            const roll = prompt("Enter Roll Number:");
            if (!roll) return;
            const center = prompt("Enter Center Name:");
            if (!center) return;
            const guardian = prompt("Enter Guardian Mobile Number:");
            if (!guardian) return;
            
            const students = JSON.parse(localStorage.getItem('students') || '[]');
            students.push({ name, roll, center, guardian, attendance: '95%', status: 'Active' });
            localStorage.setItem('students', JSON.stringify(students));
            renderStudents();
        });
    }

    // C. Center Visit Reports Section
    function renderVisits() {
        const visits = JSON.parse(localStorage.getItem('visits') || '[]');
        const timeline = document.querySelector('.timeline');
        if (!timeline) return;

        timeline.innerHTML = '';
        if (visits.length === 0) {
            timeline.innerHTML = '<p style="text-align:center; padding:24px;">No visits scheduled or reported yet. Click "Schedule New Visit" to add one.</p>';
        } else {
            visits.forEach(v => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="flex-between">
                            <h3>${v.center} - ${v.purpose}</h3>
                            <span class="text-body">${v.date}</span>
                        </div>
                        <p class="text-body" style="margin: 8px 0;"><strong>Purpose:</strong> ${v.purpose}</p>
                        <p class="text-body" style="margin: 0 0 16px 0;"><strong>Issues Found:</strong> ${v.issues}</p>
                        <span class="badge badge-success">${v.status}</span>
                    </div>
                `;
                timeline.appendChild(item);
            });
        }
    }

    const scheduleVisitBtn = document.querySelector('#view-visits .btn-primary');
    function createNewVisit() {
        const center = prompt("Enter Center Name to visit:");
        if (!center) return;
        const purpose = prompt("Enter Purpose of visit:");
        if (!purpose) return;
        const issues = prompt("Enter Issues Found (or None):") || 'None';
        
        const visits = JSON.parse(localStorage.getItem('visits') || '[]');
        visits.unshift({
            center,
            purpose,
            issues,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Report Submitted'
        });
        localStorage.setItem('visits', JSON.stringify(visits));
        renderVisits();
    }
    if (scheduleVisitBtn) scheduleVisitBtn.addEventListener('click', createNewVisit);

    // D. Resource Requests Section
    function renderResources() {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        const container = document.querySelector('#view-resources .grid-cards');
        if (!container) return;

        container.innerHTML = '';
        if (resources.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; padding:24px;">No resource requests pending.</p>';
        } else {
            resources.forEach((r, idx) => {
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.borderTop = `4px solid ${r.priority === 'High' ? 'var(--danger)' : 'var(--warning)'}`;
                card.innerHTML = `
                    <div class="flex-between">
                        <h3>${r.item}</h3>
                        <span class="badge ${r.priority === 'High' ? 'badge-danger' : 'badge-warning'}">${r.priority} Priority</span>
                    </div>
                    <div style="margin: 16px 0; color: var(--text-body);">
                        <p><strong>Center:</strong> ${r.center}</p>
                        <p><strong>By:</strong> ${r.by}</p>
                        <p><strong>Qty:</strong> ${r.qty}</p>
                    </div>
                    <div class="flex-start">
                        <button class="btn-primary approve-res-btn" data-idx="${idx}">Approve</button>
                        <button class="btn-outline reject-res-btn" data-idx="${idx}" style="color:var(--danger); border-color:var(--danger);">Reject</button>
                    </div>
                `;
                container.appendChild(card);
            });
            
            // Attach event listeners
            document.querySelectorAll('.approve-res-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    const resources = JSON.parse(localStorage.getItem('resources') || '[]');
                    resources.splice(idx, 1);
                    localStorage.setItem('resources', JSON.stringify(resources));
                    renderResources();
                    alert('Resource request approved successfully!');
                });
            });
            document.querySelectorAll('.reject-res-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    const resources = JSON.parse(localStorage.getItem('resources') || '[]');
                    resources.splice(idx, 1);
                    localStorage.setItem('resources', JSON.stringify(resources));
                    renderResources();
                    alert('Resource request rejected.');
                });
            });
        }
    }

    // E. Messaging Section
    function renderMessages() {
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const contacts = allUsers.filter(u => u.role === 'teacher' || u.role === 'volunteer');
        const chatList = document.querySelector('.chat-list');
        if (!chatList) return;

        chatList.innerHTML = '';
        if (contacts.length === 0) {
            chatList.innerHTML = '<p style="padding:16px; text-align:center; font-size:0.875rem;">No registered teachers or volunteers to chat with.</p>';
            const chatWindow = document.querySelector('.chat-window');
            if (chatWindow) chatWindow.style.display = 'none';
        } else {
            const chatWindow = document.querySelector('.chat-window');
            if (chatWindow) chatWindow.style.display = 'flex';
            contacts.forEach((c, idx) => {
                const item = document.createElement('div');
                item.className = `chat-item ${idx === 0 ? 'active' : ''}`;
                item.setAttribute('data-email', c.email);
                item.innerHTML = `
                    <div class="avatar-small">${c.fullName.charAt(0)}</div>
                    <div class="chat-item-info"><h4>${c.fullName}</h4><p class="last-msg">${c.role.charAt(0).toUpperCase() + c.role.slice(1)}</p></div>
                `;
                chatList.appendChild(item);
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    loadChat(c.email, c.fullName);
                });
            });
            
            // Initial load first chat
            if (contacts[0]) {
                loadChat(contacts[0].email, contacts[0].fullName);
            }
        }
    }
     
    function loadChat(contactEmail, contactName) {
        const headerName = document.querySelector('.chat-header h3');
        const headerAvatar = document.querySelector('.chat-header .avatar-small');
        if (headerName) headerName.textContent = contactName;
        if (headerAvatar) headerAvatar.textContent = contactName.charAt(0);
        
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';
        
        const allMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
        const filtered = allMessages.filter(m => 
            (m.sender === currentUser.email && m.receiver === contactEmail) ||
            (m.sender === contactEmail && m.receiver === currentUser.email)
        );
        
        if (filtered.length === 0) {
            messagesContainer.innerHTML = '<p style="text-align:center; padding:24px; color:var(--text-body);">No messages yet. Send a message to start the conversation!</p>';
        } else {
            filtered.forEach(m => {
                const bubble = document.createElement('div');
                bubble.className = `message-bubble ${m.sender === currentUser.email ? 'message-sent' : 'message-received'}`;
                bubble.innerHTML = m.text;
                messagesContainer.appendChild(bubble);
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    const sendBtn = document.querySelector('.chat-input button');
    const chatInput = document.querySelector('.chat-input input');
    if (sendBtn && chatInput) {
        sendBtn.replaceWith(sendBtn.cloneNode(true));
        const cleanSendBtn = document.querySelector('.chat-input button');
        
        const handleSend = () => {
            const chatBoxInput = document.querySelector('.chat-input input');
            const text = chatBoxInput.value.trim();
            if (!text) return;
            
            const activeChat = document.querySelector('.chat-item.active');
            if (!activeChat) return;
            const contactEmail = activeChat.getAttribute('data-email');
            
            const allMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
            allMessages.push({
                sender: currentUser.email,
                receiver: contactEmail,
                text: text,
                timestamp: Date.now()
            });
            localStorage.setItem('chat_messages', JSON.stringify(allMessages));
            chatBoxInput.value = '';
            loadChat(contactEmail, activeChat.querySelector('h4').textContent);
        };

        cleanSendBtn.addEventListener('click', handleSend);

        const chatBoxTextInput = document.querySelector('.chat-input input');
        chatBoxTextInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });
    }

    // F. Dropout Alerts Section
    function renderAlerts() {
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const alertsContainer = document.querySelector('#view-alerts div');
        if (!alertsContainer) return;

        // Filter students at risk (attendance < 75%)
        const atRiskStudents = students.filter(s => parseFloat(s.attendance) < 75);
        
        alertsContainer.innerHTML = '';
        if (atRiskStudents.length === 0) {
            alertsContainer.innerHTML = '<p>No dropout alerts currently. Attendance rates are stable.</p>';
        } else {
            atRiskStudents.forEach(s => {
                const card = document.createElement('div');
                card.className = 'glass-card alert-card risk-high';
                card.innerHTML = `
                    <div class="alert-header flex-between">
                        <div class="flex-start"><span class="material-symbols-rounded risk-icon" style="color:var(--danger);">error</span>
                            <div><h3>${s.name}</h3><p class="subtitle">${s.center}</p></div>
                        </div>
                        <span class="badge badge-danger">High Risk</span>
                    </div>
                    <div class="alert-body">
                        <div class="info-grid">
                            <div><small>Attendance</small><strong>${s.attendance}</strong></div>
                            <div><small>Guardian Contact</small><strong>${s.guardian}</strong></div>
                        </div>
                        <div class="reason-box">
                            <small>Alert Reason:</small>
                            <p>Critical attendance drop. Absent for multiple days.</p>
                        </div>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-action call-btn" data-phone="${s.guardian}"><span class="material-symbols-rounded">call</span> Call Parent</button>
                    </div>
                `;
                alertsContainer.appendChild(card);
            });

            document.querySelectorAll('.call-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    alert(`Calling guardian at ${btn.getAttribute('data-phone')}...`);
                });
            });
        }
        
        // Update top alert counts
        const dropoutCount = document.querySelector('.grid-stats .stat-card:nth-child(4) p.text-danger');
        if (dropoutCount) dropoutCount.textContent = `${atRiskStudents.length} Dropout Risk`;
    }

    // 4. Quick Action Floating Button (FAB) Action Selector
    const fab = document.querySelector('.fab');
    if (fab) {
        fab.addEventListener('click', () => {
            const action = prompt("Quick Actions:\n1. Schedule Visit\n2. Add Student\n3. Create Resource Request\nEnter option number (1-3):");
            if (action === '1') {
                createNewVisit();
            } else if (action === '2') {
                if (addStudentBtn) addStudentBtn.click();
            } else if (action === '3') {
                const item = prompt("Enter Resource Item (e.g. Std 1 Books):");
                if (!item) return;
                const qty = prompt("Enter Quantity:");
                if (!qty) return;
                const center = prompt("Enter Center Name:");
                if (!center) return;
                const priority = prompt("Enter Priority (High/Medium/Low):") || 'Medium';

                const resources = JSON.parse(localStorage.getItem('resources') || '[]');
                resources.push({
                    item,
                    qty,
                    center,
                    priority,
                    by: currentUser.fullName
                });
                localStorage.setItem('resources', JSON.stringify(resources));
                renderResources();
                alert('Resource request created!');
            }
        });
    }

    // 5. Notification Panel Logic
    const notificationBtn = document.getElementById('notification-btn');
    const notificationPanel = document.getElementById('notification-panel');
    const closePanelBtn = document.getElementById('close-panel');

    function togglePanel() {
        if(notificationPanel) {
            notificationPanel.classList.toggle('open');
            if (notificationPanel.classList.contains('open')) {
                markNotificationsAsRead();
            }
        }
        closeDrawer();
    }

    if(notificationBtn) notificationBtn.addEventListener('click', togglePanel);
    if(closePanelBtn) closePanelBtn.addEventListener('click', () => notificationPanel.classList.remove('open'));

    function renderNotificationsPanel() {
        const panelContent = document.querySelector('#notification-panel .panel-content');
        if (!panelContent) return;
        
        const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        // Supervisor sees: All, All Supervisors, or specific email target
        const myNotifs = notifs.filter(n => n.target === 'All' || n.target === 'All Supervisors' || n.target === currentUser.email);
        
        const badgeDot = document.querySelector('#notification-btn .badge-dot');
        const unreadCount = myNotifs.filter(n => !n.readBy || !n.readBy.includes(currentUser.email)).length;
        if (badgeDot) {
            badgeDot.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        panelContent.innerHTML = '';
        if (myNotifs.length === 0) {
            panelContent.innerHTML = '<p style="text-align:center; padding:20px; font-size:0.85rem; color:var(--text-body);">No notifications</p>';
            return;
        }
        
        myNotifs.forEach(n => {
            const isRead = n.readBy && n.readBy.includes(currentUser.email);
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.style.padding = '10px';
            item.style.marginBottom = '10px';
            item.style.background = isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)';
            item.style.borderLeft = isRead ? 'none' : '3px solid var(--primary)';
            item.style.borderRadius = '4px';
            item.innerHTML = `
                <div>
                    <strong>${n.senderName} (${n.target})</strong>
                    <p style="margin: 4px 0 0 0; font-size:0.8rem; color:var(--text-dark);">${n.message}</p>
                    <small style="font-size:0.7rem; color:var(--text-body);">${n.date}</small>
                </div>
            `;
            panelContent.appendChild(item);
        });
    }

    function markNotificationsAsRead() {
        const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        notifs.forEach(n => {
            if (n.target === 'All' || n.target === 'All Supervisors' || n.target === currentUser.email) {
                if (!n.readBy) n.readBy = [];
                if (!n.readBy.includes(currentUser.email)) {
                    n.readBy.push(currentUser.email);
                }
            }
        });
        localStorage.setItem('notifications', JSON.stringify(notifs));
        renderNotificationsPanel();
    }

    // Call dynamic notifications check on load
    renderNotificationsPanel();

    // Initialize all views data
    renderTeachers();
    renderStudents();
    renderVisits();
    renderResources();
    renderMessages();
    renderAlerts();

    // ==========================================
    // GOOGLE MAPS & SUPABASE REAL-TIME GIS SYSTEM
    // ==========================================
    let supabaseClient = null;
    let locationsData = [];
    let googleMap = null;
    let googleMapMarkers = [];
    let googleSearchMarker = null;
    let googleMyLocationMarker = null;
    let googleMapClusterer = null;
    let gisInitializationPromise = null;

    // Dynamic Script Loader for Google Maps
    function loadGoogleMapsScript(apiKey) {
        return new Promise((resolve, reject) => {
            // 1. If google maps object is already loaded, resolve immediately
            if (window.google && window.google.maps) {
                resolve();
                return;
            }
            
            // 2. If the script is already in the document, wait for it or resolve
            const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
            if (existingScript) {
                if (window.google && window.google.maps) {
                    resolve();
                } else {
                    const timer = setInterval(() => {
                        if (window.google && window.google.maps) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                    // Safety timeout of 15s
                    setTimeout(() => {
                        clearInterval(timer);
                        reject(new Error('Google Maps script load timed out.'));
                    }, 15000);
                }
                return;
            }

            // 3. Create and append the script
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Google Maps script failed to load (Network/Billing/Key Error).'));
            };
            document.head.appendChild(script);
        });
    }

    // Dynamic Environment variables loader
    async function loadEnv() {
        const env = {
            VITE_GOOGLE_MAPS_API_KEY: '',
            VITE_SUPABASE_URL: '',
            VITE_SUPABASE_ANON_KEY: ''
        };

        // 1. Try Vercel Serverless API first
        try {
            const res = await fetch('/api/env');
            if (res.ok) {
                const data = await res.json();
                if (data && data.VITE_GOOGLE_MAPS_API_KEY) {
                    console.log('Environment variables loaded from serverless API.');
                    return data;
                }
            }
        } catch (e) {
            console.log('Vercel serverless API not available, falling back to local files.');
        }

        // 2. Fallback to local .env file
        try {
            const res = await fetch('.env');
            if (res.ok) {
                const text = await res.text();
                text.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                        env[key] = val;
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to parse .env file, resolving CORS or offline backups.', e);
        }

        env.VITE_GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('VITE_GOOGLE_MAPS_API_KEY') || '';
        env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || localStorage.getItem('VITE_SUPABASE_URL') || '';
        env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '';

        return env;
    }

    // Initialize GIS Client systems
    let envConfig = null;
    function initializeGISSystem() {
        if (gisInitializationPromise) return gisInitializationPromise;

        gisInitializationPromise = (async () => {
            envConfig = await loadEnv();

            // Set up Global Error handler for maps authentication
            window.gm_authFailure = () => {
                console.error("Google Maps API authentication failed. Verify API Key restrictions, billing, or referrer policies in Google Cloud Console.");
                showGoogleMapsErrorPlaceholder("API authentication failed. This can be caused by:\n- Invalid API Key\n- Referer Not Allowed (gyanshala-gamma.vercel.app/*)\n- Billing Disabled on Google Cloud Project\n- Maps JavaScript API Disabled\n- Quota Exceeded");
            };

            // 1. Setup Supabase Client
            if (envConfig.VITE_SUPABASE_URL && envConfig.VITE_SUPABASE_ANON_KEY) {
                try {
                    supabaseClient = supabase.createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);
                    console.log('Supabase Connection established.');
                    setupSupabaseRealtime();
                } catch (err) {
                    console.error('Supabase Initialization Failed. Defaulting to local storage.', err);
                    setupMockSupabaseFallback();
                }
            } else {
                console.warn('Supabase credentials missing. Defaulting to local offline storage.');
                setupMockSupabaseFallback();
            }

            // 2. Fetch Locations
            await loadLocationsFromDatabase();

            // 3. Load Google Maps Script
            if (envConfig.VITE_GOOGLE_MAPS_API_KEY) {
                try {
                    await loadGoogleMapsScript(envConfig.VITE_GOOGLE_MAPS_API_KEY);
                    console.log('Google Maps ready.');
                    // Render the map if centers view is active on start
                    if (window.location.hash === '#centers') {
                        renderGISMap();
                    }
                } catch (err) {
                    console.error('Google Maps Load Error:', err);
                    showGoogleMapsErrorPlaceholder('Library script load failed: ' + err.message);
                    throw err;
                }
            } else {
                showGoogleMapsErrorPlaceholder('API key not configured in .env file or Vercel Environment Variables.');
                throw new Error('API key missing');
            }
        })();

        return gisInitializationPromise;
    }

    // Supabase Real-time updates subscription
    function setupSupabaseRealtime() {
        if (!supabaseClient) return;
        supabaseClient
            .channel('gis_realtime_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'gis_locations' },
                async (payload) => {
                    console.log('Database synchronization received:', payload);
                    await loadLocationsFromDatabase();
                    if (googleMap) {
                        renderMarkersOnGoogleMap();
                    }
                }
            )
            .subscribe();
    }

    // Online/Offline status event watchers
    function setupMockSupabaseFallback() {
        const handleOnline = () => {
            const alertBox = document.getElementById('gis-offline-alert');
            if (alertBox) alertBox.style.display = 'none';
        };
        const handleOffline = () => {
            const alertBox = document.getElementById('gis-offline-alert');
            if (alertBox) alertBox.style.display = 'flex';
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if (!navigator.onLine) handleOffline();
    }

    // Database Loaders
    async function loadLocationsFromDatabase() {
        try {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.from('gis_locations').select('*');
                if (error) throw error;
                locationsData = data || [];
            } else {
                locationsData = JSON.parse(localStorage.getItem('supabase_gis_locations_mock') || '[]');
            }
        } catch (err) {
            console.warn('Supabase fetch failed. Pulling from local cache.', err);
            locationsData = JSON.parse(localStorage.getItem('supabase_gis_locations_mock') || '[]');
        }
    }

    // Google Maps Initializer
    async function renderGISMap() {
        const mapContainer = document.getElementById('google-map-container');
        if (!mapContainer) return;

        // If offline warning needs to be updated
        const alertBox = document.getElementById('gis-offline-alert');
        if (alertBox) alertBox.style.display = navigator.onLine ? 'none' : 'flex';

        if (!window.google || !window.google.maps) {
            showGoogleMapsErrorPlaceholder();
            return;
        }

        // Initialize Map Control once
        if (!googleMap) {
            const ahmedabad = { lat: 23.0225, lng: 72.5714 };

            googleMap = new google.maps.Map(mapContainer, {
                center: ahmedabad,
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                zoomControl: true,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                streetViewControl: true,
                fullscreenControl: true,
                scaleControl: true,
                rotateControl: true,
                compass: true
            });

            // Browser GPS check
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const userLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        googleMap.setCenter(userLatLng);
                        dropMyLocationMarker(userLatLng);
                    },
                    () => {
                        console.log('Location access blocked. Center set to Ahmedabad.');
                    }
                );
            }

            // Wire helpers
            setupGooglePlacesAutocomplete();
            setupMapFilters();
            setupMyLocationButton();
        }

        // Render markers
        renderMarkersOnGoogleMap();
    }

    // Places autocomplete search input handler
    function setupGooglePlacesAutocomplete() {
        const input = document.getElementById('gismap-search-input');
        if (!input) return;

        const autocomplete = new google.maps.places.Autocomplete(input, {
            fields: ["geometry", "name", "formatted_address"]
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
                alert("Location details not found.");
                return;
            }

            googleMap.setCenter(place.geometry.location);
            googleMap.setZoom(16);

            // Clear previous search marker
            if (googleSearchMarker) googleSearchMarker.setMap(null);

            googleSearchMarker = new google.maps.Marker({
                position: place.geometry.location,
                map: googleMap,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                },
                title: place.name || 'Searched Point'
            });
        });
    }

    // Map filters layer checkboxes
    function setupMapFilters() {
        const ids = ['filter-main-office', 'filter-learning-center', 'filter-classroom', 'filter-volunteer', 'filter-risk-area'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    renderMarkersOnGoogleMap();
                });
            }
        });
    }

    // GPS location center button
    function setupMyLocationButton() {
        const btn = document.getElementById('btn-my-location');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        googleMap.setCenter(latlng);
                        googleMap.setZoom(16);
                        dropMyLocationMarker(latlng);
                    },
                    (err) => {
                        alert('Could not acquire GPS: ' + err.message);
                    }
                );
            }
        });
    }

    // Drop User location marker
    function dropMyLocationMarker(latlng) {
        if (googleMyLocationMarker) googleMyLocationMarker.setMap(null);
        googleMyLocationMarker = new google.maps.Marker({
            position: latlng,
            map: googleMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2
            },
            title: 'My Position'
        });
    }

    // Render markers (Supervisor version without edit/delete buttons)
    function renderMarkersOnGoogleMap() {
        // 1. Clear previous markers
        googleMapMarkers.forEach(m => m.setMap(null));
        googleMapMarkers = [];

        // 2. Fetch filter values
        const showMainOffice = document.getElementById('filter-main-office').checked;
        const showLearningCenter = document.getElementById('filter-learning-center').checked;
        const showClassroom = document.getElementById('filter-classroom').checked;
        const showVolunteer = document.getElementById('filter-volunteer').checked;
        const showRiskArea = document.getElementById('filter-risk-area').checked;

        // 3. Render locations
        locationsData.forEach(loc => {
            // Apply layer filters
            if (loc.type === 'Main Office' && !showMainOffice) return;
            if (loc.type === 'Learning Center' && !showLearningCenter) return;
            if (loc.type === 'Classroom' && !showClassroom) return;
            if (loc.type === 'Volunteer' && !showVolunteer) return;
            if (loc.type === 'Risk Area' && !showRiskArea) return;

            let color = '#2563EB'; // Blue
            let emoji = '🏢';
            switch (loc.type) {
                case 'Main Office': color = '#2563EB'; emoji = '🏢'; break;
                case 'Learning Center': color = '#16A34A'; emoji = '🎓'; break;
                case 'Classroom': color = '#D97706'; emoji = '🏫'; break;
                case 'Volunteer': color = '#7C3AED'; emoji = '🙋'; break;
                case 'Risk Area': color = '#DC2626'; emoji = '⚠️'; break;
            }

            const marker = new google.maps.Marker({
                position: { lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) },
                map: googleMap,
                label: {
                    text: emoji,
                    fontSize: '12px'
                },
                icon: {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                    scale: 6
                },
                title: loc.name
            });

            // InfoWindow content builder
            const statusColor = loc.status === 'Healthy' ? '#16A34A' : (loc.status === 'Warning' ? '#D97706' : '#EF4444');
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="font-family:'Poppins', sans-serif; padding: 12px; min-width: 250px; color:#1E293B;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:6px; margin-bottom:8px;">
                            <h3 style="margin:0; font-size:1rem; color:#0F172A;">${loc.name}</h3>
                            <span style="font-size:0.75rem; font-weight:600; padding:2px 8px; border-radius:12px; background:${color}15; color:${color};">${loc.type}</span>
                        </div>
                        
                        ${loc.photo_url ? `<div style="text-align:center; margin-bottom:8px;"><img src="${loc.photo_url}" style="max-width:100%; max-height:85px; border-radius:6px; object-fit:cover;"></div>` : ''}

                        <table style="width:100%; font-size:0.8rem; border-collapse:collapse; margin-bottom:8px;">
                            <tr><td style="padding:3px 0; color:#64748B;"><strong>Lead:</strong></td><td style="text-align:right;">${loc.teacher || 'N/A'}</td></tr>
                            <tr><td style="padding:3px 0; color:#64748B;"><strong>Capacity:</strong></td><td style="text-align:right;">${loc.capacity || '0'}</td></tr>
                            <tr><td style="padding:3px 0; color:#64748B;"><strong>Contact:</strong></td><td style="text-align:right;">${loc.contact || 'N/A'}</td></tr>
                            <tr><td style="padding:3px 0; color:#64748B;"><strong>Status:</strong></td><td style="text-align:right; font-weight:600; color:${statusColor};">${loc.status || 'Healthy'}</td></tr>
                            <tr><td style="padding:3px 0; color:#64748B;"><strong>Address:</strong></td><td style="text-align:right; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${loc.address}">${loc.address}</td></tr>
                        </table>

                        <div style="display:flex; justify-content:space-between; margin-top:8px; gap:8px;">
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank" style="flex:1; padding:8px; font-size:0.8rem; font-weight:600; border:none; background:#2563EB; color:white; border-radius:6px; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">navigation</span> Get Directions</a>
                        </div>
                    </div>
                `
            });

            // Markers click popup opener
            marker.addListener('click', () => {
                infoWindow.open(googleMap, marker);
            });

            googleMapMarkers.push(marker);
        });

        // Add Marker Clustering for 50+ locations
        if (window.MarkerClusterer && googleMapMarkers.length > 50) {
            if (googleMapClusterer) googleMapClusterer.clearMarkers();
            googleMapClusterer = new MarkerClusterer(googleMap, googleMapMarkers, {
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
            });
        }
    }

    // Google Maps Error Placeholder fallback
    function showGoogleMapsErrorPlaceholder(msg) {
        const mapContainer = document.getElementById('google-map-container');
        if (!mapContainer) return;

        mapContainer.style.background = '#f8fafc';
        mapContainer.style.display = 'flex';
        mapContainer.style.flexDirection = 'column';
        mapContainer.style.alignItems = 'center';
        mapContainer.style.justifyContent = 'center';
        mapContainer.style.gap = '16px';
        mapContainer.style.padding = '32px';
        mapContainer.style.textAlign = 'center';

        mapContainer.innerHTML = `
            <span class="material-symbols-rounded" style="font-size: 64px; color: var(--danger);">report_problem</span>
            <h3 style="margin: 0; font-size: 1.25rem; color: #1e293b;">Unable to load Google Maps.</h3>
            <p style="margin: 0; color: var(--text-body); font-size: 0.9rem; max-width: 350px;">${msg || 'Check your network connection or verify your Google Maps API Key.'}</p>
            <button class="btn-primary" id="btn-maps-retry" style="padding: 10px 24px; border-radius: var(--radius-md);">Retry Loading</button>
        `;

        const retry = document.getElementById('btn-maps-retry');
        if (retry) {
            retry.addEventListener('click', (e) => {
                e.preventDefault();
                mapContainer.innerHTML = '<p style="color:var(--text-body);">Reloading Google Maps...</p>';
                gisInitializationPromise = null; // Clear cached promise on manual retry!
                initializeGISSystem().then(() => {
                    renderGISMap();
                }).catch(err => {
                    console.error('Retry failed:', err);
                });
            });
        }
    }

    // View Center on Map triggers
    document.querySelectorAll('.view-center-on-map').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lng = parseFloat(btn.getAttribute('data-lng'));
            
            // Switch view
            switchView('centers');
            
            // Center Google Map
            if (googleMap) {
                googleMap.setCenter({ lat, lng });
                googleMap.setZoom(15);
            } else {
                // If map not loaded yet, wait for initialization
                initializeGISSystem().then(() => {
                    renderGISMap().then(() => {
                        if (googleMap) {
                            googleMap.setCenter({ lat, lng });
                            googleMap.setZoom(15);
                        }
                    });
                });
            }
        });
    });

    // Initialize environment loader immediately at page startup
    initializeGISSystem();
});
