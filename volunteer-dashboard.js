document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Session check (Auth Guard)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'volunteer') {
        alert('Access denied. Please login with a Volunteer account.');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }

    // Dynamic Time & Date Ticker
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    // Populate Top Bar Profile details
    const topBarAvatar = document.querySelector('.top-bar-right .avatar');
    if (topBarAvatar) topBarAvatar.textContent = currentUser.fullName.charAt(0);

    // Sidebar Collapsing
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Seed Zenish Patel / gtuid internship defaults
    if (!localStorage.getItem('volunteer_profile_seeded')) {
        currentUser.id = 'VOL-2026-014';
        currentUser.department = 'Education Volunteer';
        currentUser.college = 'Vishwakarma Government Engineering College (VGEC)';
        currentUser.university = 'GTU';
        currentUser.internship = 'Societal Internship';
        currentUser.duration = '2 Weeks';
        currentUser.supervisor = 'Priya Shah';
        currentUser.status = 'Active';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('volunteer_profile_seeded', 'true');
    }

    // Seed Volunteer Attendance History
    const attLogs = JSON.parse(localStorage.getItem('volunteer_attendance') || '[]');
    if (attLogs.length === 0) {
        attLogs.push({ date: '02 Jul', status: 'Present', hours: 4 });
        attLogs.push({ date: '03 Jul', status: 'Present', hours: 5 });
        attLogs.push({ date: '04 Jul', status: 'Present', hours: 4 });
        attLogs.push({ date: '05 Jul', status: 'Absent', hours: 0 });
        attLogs.push({ date: '06 Jul', status: 'Present', hours: 6 });
        attLogs.push({ date: '07 Jul', status: 'Present', hours: 5 });
        localStorage.setItem('volunteer_attendance', JSON.stringify(attLogs));
    }

    // Seed Activity Reports
    const actReports = JSON.parse(localStorage.getItem('activity_reports') || '[]');
    if (actReports.length === 0) {
        actReports.push({ date: '02 Jul', center: 'Bapunagar Center', topic: 'Math Activity', present: 42, remarks: 'Good Participation' });
        actReports.push({ date: '03 Jul', center: 'Naroda Center', topic: 'Reading Session', present: 39, remarks: 'Needs Improvement' });
        actReports.push({ date: '04 Jul', center: 'Bapunagar Center', topic: 'Drawing Competition', present: 44, remarks: 'Excellent Response' });
        localStorage.setItem('activity_reports', JSON.stringify(actReports));
    }

    // Seed Photo Gallery
    const galleryPhotos = JSON.parse(localStorage.getItem('volunteer_photos') || '[]');
    if (galleryPhotos.length === 0) {
        galleryPhotos.push({ title: 'Teaching Session', date: '02 Jul', center: 'Bapunagar Center', desc: 'Zenish teaching basic mathematics using flashcards.' });
        galleryPhotos.push({ title: 'Drawing Competition', date: '04 Jul', center: 'Bapunagar Center', desc: 'Student displaying their drawing templates.' });
        galleryPhotos.push({ title: 'Sports Session', date: '06 Jul', center: 'Naroda Center', desc: 'Outdoor sports games with volunteers.' });
        localStorage.setItem('volunteer_photos', JSON.stringify(galleryPhotos));
    }

    // 2. Single Page Router
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pageViews = document.querySelectorAll('.page-view');

    function switchView(viewId) {
        pageViews.forEach(view => view.classList.remove('active'));
        navItems.forEach(item => item.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.add('active');

        const activeNav = document.querySelector(`.sidebar-nav .nav-item[data-target="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        triggerViewRenderer(viewId);
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

    // Check URL hash
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`view-${initialHash}`)) {
        switchView(initialHash);
    } else {
        switchView('home');
    }

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }

    // Dynamic Chart Instances
    let hoursHistoryChart = null;
    let hoursDistributionChart = null;

    // 3. Dynamic Rendering Engine (View Triggerers)
    function triggerViewRenderer(viewId) {
        switch (viewId) {
            case 'home':
                renderDashboardHome();
                break;
            case 'centers':
                renderCenters();
                break;
            case 'schedule':
                renderSchedule();
                break;
            case 'attendance':
                renderAttendance();
                break;
            case 'submitreport':
                renderSubmitReportForm();
                break;
            case 'photos':
                renderPhotos();
                break;
            case 'hours':
                renderHours();
                break;
            case 'messages':
                renderMessages();
                break;
            case 'profile':
                renderProfile();
                break;
            case 'settings':
                renderSettings();
                break;
        }
    }

    // Fetch Database Helper functions
    function getAttendance() {
        return JSON.parse(localStorage.getItem('volunteer_attendance') || '[]');
    }

    function getReports() {
        return JSON.parse(localStorage.getItem('activity_reports') || '[]');
    }

    function getPhotos() {
        return JSON.parse(localStorage.getItem('volunteer_photos') || '[]');
    }

    // A. Dashboard Home Section
    function renderDashboardHome() {
        const attendance = getAttendance();
        const reports = getReports();
        const photos = getPhotos();

        // Calculate hours worked
        let totalHours = 0;
        attendance.forEach(a => totalHours += parseInt(a.hours || 0));

        // Update home metrics
        document.getElementById('kpi-centers').textContent = '2 Assigned';
        document.getElementById('kpi-students').textContent = '83 Taught';
        document.getElementById('kpi-hours').textContent = `${totalHours} Hours`;
        document.getElementById('kpi-photos').textContent = `${photos.length} Uploaded`;
        document.getElementById('kpi-reports').textContent = `${reports.length} Filed`;

        // Update Internship Summary widgets
        document.getElementById('profile-summary-name').textContent = currentUser.fullName;
        document.getElementById('profile-summary-id').textContent = currentUser.id || 'VOL-2026-014';
        document.getElementById('profile-summary-college').textContent = currentUser.college || 'VGEC';
        document.getElementById('profile-summary-university').textContent = currentUser.university || 'GTU';
        document.getElementById('profile-summary-sup').textContent = currentUser.supervisor || 'Priya Shah';
    }

    // B. Assigned Centers Management
    function renderCenters() {
        const tbody = document.querySelector('#view-centers tbody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td><strong>Bapunagar Center (LC-1)</strong></td>
                <td>Meena Patel</td>
                <td>45</td>
                <td>Mon, Wed, Fri</td>
                <td><span class="badge badge-active">Active</span></td>
            </tr>
            <tr>
                <td><strong>Naroda Center (LC-2)</strong></td>
                <td>Rakesh Kumar</td>
                <td>38</td>
                <td>Tue, Thu, Sat</td>
                <td><span class="badge badge-active">Active</span></td>
            </tr>
        `;
    }

    // C. Activity Schedule
    function renderSchedule() {
        const tbody = document.querySelector('#view-schedule tbody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr><td><strong>Monday</strong></td><td>Bapunagar Center</td><td>Teaching Mathematics, Storytelling</td></tr>
            <tr><td><strong>Tuesday</strong></td><td>Naroda Center</td><td>English Reading, Vocabulary Games</td></tr>
            <tr><td><strong>Wednesday</strong></td><td>Bapunagar Center</td><td>Science Experiments, Quiz Competition</td></tr>
            <tr><td><strong>Thursday</strong></td><td>Naroda Center</td><td>Computer Basics, Homework Review</td></tr>
            <tr><td><strong>Friday</strong></td><td>Bapunagar Center</td><td>Environmental Awareness, Tree Plantation</td></tr>
            <tr><td><strong>Saturday</strong></td><td>Naroda Center</td><td>Sports, Yoga, Life Skills Session</td></tr>
        `;
    }

    // D. Attendance History
    function renderAttendance() {
        const logs = getAttendance();
        const tbody = document.querySelector('#view-attendance tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${l.date}</strong></td>
                <td>${l.hours} Hours</td>
                <td><span class="badge ${l.status === 'Present' ? 'badge-active' : 'badge-risk'}" style="background-color:${l.status === 'Present' ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)'}; color:${l.status === 'Present' ? 'var(--secondary)' : 'var(--danger)'};">${l.status}</span></td>
            `;
            tbody.appendChild(tr);
        });

        // Submit daily working hours
        const logHoursBtn = document.getElementById('log-hours');
        if (logHoursBtn) {
            logHoursBtn.replaceWith(logHoursBtn.cloneNode(true));
            document.getElementById('log-hours').addEventListener('click', () => {
                const date = prompt("Enter Date (e.g. 08 Jul):");
                if (!date) return;
                const hours = prompt("Enter Hours Worked:");
                if (!hours) return;
                const status = parseInt(hours) > 0 ? 'Present' : 'Absent';

                const logs = getAttendance();
                logs.push({ date, hours: parseInt(hours) || 0, status });
                localStorage.setItem('volunteer_attendance', JSON.stringify(logs));
                renderAttendance();
                alert('Hours logged successfully.');
            });
        }
    }

    // E. Submit Activity Report
    function renderSubmitReportForm() {
        const form = document.getElementById('activity-report-form');
        if (!form) return;

        form.replaceWith(form.cloneNode(true));
        const cleanForm = document.getElementById('activity-report-form');

        cleanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('act-date').value;
            const center = document.getElementById('act-center').value;
            const topic = document.getElementById('act-topic').value.trim();
            const present = document.getElementById('act-present').value;
            const remarks = document.getElementById('act-remarks').value.trim() || 'Good Participation';

            const reports = getReports();
            reports.push({ date, center, topic, present, remarks });
            localStorage.setItem('activity_reports', JSON.stringify(reports));

            alert('Activity report successfully filed.');
            switchView('submitreport');
        });

        // Populate history log table
        const tbody = document.querySelector('#activity-history-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const reports = getReports();
            reports.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${r.date}</strong></td>
                    <td>${r.center}</td>
                    <td>${r.topic}</td>
                    <td>${r.present}</td>
                    <td>${r.remarks}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // F. Photo Gallery view
    function renderPhotos() {
        const photos = getPhotos();
        const gallery = document.getElementById('gallery-container');
        if (!gallery) return;
        gallery.innerHTML = '';

        photos.forEach(p => {
            const card = document.createElement('div');
            card.className = 'glass-card photo-card';
            card.innerHTML = `
                <img src="${p.base64 || 'images/volunteer_illustration_1782536659447.jpg'}" alt="${p.title}">
                <div class="photo-card-info">
                    <h4>${p.title}</h4>
                    <p>${p.date} • ${p.center}</p>
                    <p style="margin-top:6px; font-size:0.8rem; line-height:1.3;">${p.desc}</p>
                </div>
            `;
            gallery.appendChild(card);
        });

        // Handle Image upload trigger
        const fileInput = document.getElementById('photo-upload-input');
        if (fileInput) {
            fileInput.replaceWith(fileInput.cloneNode(true));
            const cleanInput = document.getElementById('photo-upload-input');
            cleanInput.addEventListener('change', () => {
                const file = cleanInput.files[0];
                if (!file) return;

                const title = prompt("Enter Photo Category/Title (e.g. Tree Plantation):");
                if (!title) return;
                const desc = prompt("Enter Description:");
                if (!desc) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const photos = getPhotos();
                    photos.push({
                        title,
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        center: 'Hope Hub Center',
                        desc,
                        base64: e.target.result
                    });
                    localStorage.setItem('volunteer_photos', JSON.stringify(photos));
                    renderPhotos();
                    alert('Photo successfully added to internship portfolio.');
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // G. Volunteer Hours Section
    function renderHours() {
        const attendance = getAttendance();
        let totalHours = 0;
        attendance.forEach(a => totalHours += parseInt(a.hours || 0));
        
        const remaining = Math.max(0, 160 - totalHours);

        document.getElementById('hours-completed-value').textContent = `${totalHours} Hours`;
        document.getElementById('hours-remaining-value').textContent = `${remaining} Hours`;

        if (typeof Chart === 'undefined') return;

        // Hour distribution doughnut chart
        const distCtx = document.getElementById('hoursDistributionChart');
        if (distCtx) {
            if (hoursDistributionChart) hoursDistributionChart.destroy();
            hoursDistributionChart = new Chart(distCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Hours Completed', 'Hours Remaining'],
                    datasets: [{
                        data: [totalHours, remaining],
                        backgroundColor: ['#22C55E', '#2563EB']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // H. Chat messages Section
    function renderMessages() {
        const chatList = document.querySelector('.chat-list');
        if (!chatList) return;
        
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const supervisorUser = allUsers.find(u => u.role === 'supervisor') || { email: 'supervisor@gyanshala.org', fullName: 'Priya Shah' };
        const teacherUser = allUsers.find(u => u.role === 'teacher') || { email: 'teacher@gyanshala.org', fullName: 'Meena Patel' };

        chatList.innerHTML = `
            <div class="chat-item active" data-email="${supervisorUser.email}">
                <div class="avatar">${supervisorUser.fullName.charAt(0)}</div>
                <div class="chat-item-info"><h4>${supervisorUser.fullName}</h4><p class="last-msg">Supervisor</p></div>
            </div>
            <div class="chat-item" data-email="${teacherUser.email}">
                <div class="avatar">${teacherUser.fullName.charAt(0)}</div>
                <div class="chat-item-info"><h4>${teacherUser.fullName}</h4><p class="last-msg">Teacher</p></div>
            </div>
        `;

        loadChat(supervisorUser.email, supervisorUser.fullName);

        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const email = item.getAttribute('data-email');
                const name = item.querySelector('h4').textContent;
                loadChat(email, name);
            });
        });
    }

    function loadChat(email, name) {
        document.querySelector('.chat-header h3').textContent = name;
        document.querySelector('.chat-header .avatar').textContent = name.charAt(0);

        const chatBox = document.querySelector('.chat-messages');
        if (!chatBox) return;
        chatBox.innerHTML = '';

        const messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
        const filtered = messages.filter(m => 
            (m.sender === currentUser.email && m.receiver === email) ||
            (m.sender === email && m.receiver === currentUser.email)
        );

        if (filtered.length === 0) {
            chatBox.innerHTML = `<p style="text-align:center; padding:16px;">No message history. Send a message to start.</p>`;
        } else {
            filtered.forEach(m => {
                const bubble = document.createElement('div');
                bubble.className = `chat-bubble ${m.sender === currentUser.email ? 'chat-sent' : 'chat-received'}`;
                bubble.textContent = m.text;
                chatBox.appendChild(bubble);
            });
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const sendBtn = document.querySelector('.chat-input button');
    const textInput = document.querySelector('.chat-input input');
    if (sendBtn && textInput) {
        sendBtn.replaceWith(sendBtn.cloneNode(true));
        const cleanSendBtn = document.querySelector('.chat-input button');
        
        const handleSend = () => {
            const chatBoxInput = document.querySelector('.chat-input input');
            const text = chatBoxInput.value.trim();
            if (!text) return;

            const activeChat = document.querySelector('.chat-item.active');
            if (!activeChat) return;
            const email = activeChat.getAttribute('data-email');

            const messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
            messages.push({
                sender: currentUser.email,
                receiver: email,
                text,
                timestamp: Date.now()
            });
            localStorage.setItem('chat_messages', JSON.stringify(messages));
            chatBoxInput.value = '';
            loadChat(email, activeChat.querySelector('h4').textContent);
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

    // Dynamic Notifications Panel Drawer System
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
    }

    if(notificationBtn) notificationBtn.addEventListener('click', togglePanel);
    if(closePanelBtn) closePanelBtn.addEventListener('click', () => notificationPanel.classList.remove('open'));

    function renderNotificationsPanel() {
        const panelContent = document.querySelector('#notification-panel .panel-content');
        if (!panelContent) return;
        
        const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        // Volunteer sees: All, All Volunteers, or specific email target
        const myNotifs = notifs.filter(n => n.target === 'All' || n.target === 'All Volunteers' || n.target === currentUser.email);
        
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
            if (n.target === 'All' || n.target === 'All Volunteers' || n.target === currentUser.email) {
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

    // I. Profile Page
    function renderProfile() {
        const infoValues = document.querySelectorAll('#view-profile .info-row .value');
        if (infoValues.length >= 5) {
            infoValues[0].textContent = currentUser.id || 'VOL-2026-014';
            infoValues[1].textContent = currentUser.college || 'VGEC';
            infoValues[2].textContent = currentUser.university || 'GTU';
            infoValues[3].textContent = currentUser.supervisor || 'Priya Shah';
            infoValues[4].textContent = currentUser.duration || '2 Weeks';
        }
    }

    // J. Settings Toggle
    function renderSettings() {
        const themeToggle = document.getElementById('dark-theme-toggle');
        if (themeToggle) {
            themeToggle.checked = document.body.classList.contains('dark-theme');
            themeToggle.addEventListener('change', () => {
                if (themeToggle.checked) {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove('dark-theme');
                }
            });
        }
    }

});
