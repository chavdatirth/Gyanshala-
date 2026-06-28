document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Session check (Auth Guard)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'teacher') {
        alert('Access denied. Please login with a Teacher account.');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }

    // Dynamic Time and Date Ticker
    function updateTicker() {
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');
        const now = new Date();
        if (timeElement) timeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateElement) dateElement.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    updateTicker();
    setInterval(updateTicker, 1000);

    // Populate Top Bar Profile details
    const topBarAvatar = document.querySelector('.top-bar-right .avatar');
    if (topBarAvatar) topBarAvatar.textContent = currentUser.fullName.charAt(0);
    const welcomeMsg = document.querySelector('.welcome-msg h3');
    // If there's an element welcoming the teacher:
    const welcomeText = document.getElementById('welcome-teacher-name');
    if (welcomeText) welcomeText.textContent = currentUser.fullName;

    // Sidebar Collapsing
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 2. Single Page Application Routing
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

    // Check URL hash on page load
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

    // Dynamic Chart Instances to prevent duplication on view switches
    let attendanceChart = null;
    let performanceChart = null;
    let monthlyAttendanceChart = null;
    let assessmentCompChart = null;
    let studentProfileProgressChart = null;

    // 3. Dynamic Rendering Engine (View Triggerers)
    function triggerViewRenderer(viewId) {
        switch (viewId) {
            case 'home':
                renderDashboardHome();
                break;
            case 'students':
                renderStudents();
                break;
            case 'addstudent':
                renderAddStudentForm();
                break;
            case 'studentprofile':
                renderStudentProfilePage();
                break;
            case 'attendance':
                renderAttendanceTracker();
                break;
            case 'assessments':
                renderAssessments();
                break;
            case 'alerts':
                renderDropoutAlerts();
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
            case 'help':
                renderHelp();
                break;
        }
    }

    // Fetch Database Helper functions
    function getStudents() {
        return JSON.parse(localStorage.getItem('students') || '[]');
    }

    function getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    // A. Dashboard Home Section
    function renderDashboardHome() {
        const students = getStudents();
        const alerts = students.filter(s => parseFloat(s.attendance) < 75);
        const assessments = JSON.parse(localStorage.getItem('assessments') || '[]');

        // Set KPI Numbers
        document.getElementById('kpi-total-students').textContent = students.length;
        document.getElementById('kpi-dropout-risk').textContent = alerts.length;
        document.getElementById('kpi-assessments-completed').textContent = assessments.length;
        
        let totalAttendanceSum = 0;
        students.forEach(s => totalAttendanceSum += parseFloat(s.attendance || 100));
        const avgAttendance = students.length > 0 ? Math.round(totalAttendanceSum / students.length) : 0;
        document.getElementById('kpi-today-attendance').textContent = `${avgAttendance}%`;

        // Render Dashboard Charts
        initDashboardCharts(students);

        // Populate recent activity
        const activitiesList = document.querySelector('#dashboard-activities');
        if (activitiesList) {
            activitiesList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon"><span class="material-symbols-rounded">edit</span></div>
                    <div><strong>Graded Math Assignment</strong><p style="margin:0; font-size:0.75rem; color:var(--text-body);">2 hours ago</p></div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon"><span class="material-symbols-rounded">check_circle</span></div>
                    <div><strong>Submitted Daily Attendance</strong><p style="margin:0; font-size:0.75rem; color:var(--text-body);">Today, 9:00 AM</p></div>
                </div>
            `;
        }
    }

    function initDashboardCharts(students) {
        if (typeof Chart === 'undefined') return;

        // 1. Attendance Trend Line Chart
        const attendanceCtx = document.getElementById('attendanceTrendChart');
        if (attendanceCtx) {
            if (attendanceChart) attendanceChart.destroy();
            attendanceChart = new Chart(attendanceCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    datasets: [{
                        label: 'Class Attendance %',
                        data: [92, 94, 91, 95, 93],
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.05)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 2. Student Performance Bar Chart
        const performanceCtx = document.getElementById('studentPerformanceChart');
        if (performanceCtx) {
            if (performanceChart) performanceChart.destroy();
            
            // Derive student names and attendance rates for comparison
            const labels = students.slice(0, 5).map(s => s.name) || ['Ravi', 'Sneha'];
            const data = students.slice(0, 5).map(s => parseFloat(s.attendance)) || [90, 95];

            performanceChart = new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: labels.length > 0 ? labels : ['No Data'],
                    datasets: [{
                        label: 'Attendance Rate',
                        data: data.length > 0 ? data : [0],
                        backgroundColor: '#7C3AED',
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // B. Student Directory
    function renderStudents() {
        const students = getStudents();
        const tbody = document.querySelector('#view-students tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px;">No registered students. Go to "Add Student" to create one.</td></tr>';
        } else {
            students.forEach((s, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.roll || 'GS-ST-' + (100 + idx)}</td>
                    <td>${s.center || 'Hope Hub'}</td>
                    <td>${s.attendance}</td>
                    <td>${s.guardian}</td>
                    <td><span class="badge ${parseFloat(s.attendance) >= 75 ? 'badge-active' : 'badge-risk'}">${parseFloat(s.attendance) >= 75 ? 'Active' : 'At Risk'}</span></td>
                    <td>
                        <button class="btn-outline view-profile-btn" data-idx="${idx}">View Profile</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.view-profile-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    localStorage.setItem('selectedStudentIdx', idx);
                    switchView('studentprofile');
                });
            });
        }
    }

    // C. Add Student Form
    function renderAddStudentForm() {
        const form = document.getElementById('add-student-form');
        if (!form) return;

        form.replaceWith(form.cloneNode(true)); // reset listeners
        const cleanForm = document.getElementById('add-student-form');

        cleanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('studentName').value.trim();
            const roll = document.getElementById('studentRoll').value.trim();
            const center = document.getElementById('studentCenter').value;
            const guardian = document.getElementById('guardianName').value.trim();
            const guardianPhone = document.getElementById('guardianPhone').value.trim();
            
            const students = getStudents();
            students.push({
                name,
                roll,
                center,
                guardian,
                guardianPhone,
                attendance: '100%',
                status: 'Active'
            });
            localStorage.setItem('students', JSON.stringify(students));
            alert(`Student ${name} successfully registered.`);
            switchView('students');
        });
    }

    // D. Student Profile Detail Page
    function renderStudentProfilePage() {
        const idx = localStorage.getItem('selectedStudentIdx');
        const students = getStudents();
        const student = students[idx];
        if (!student) {
            alert('No student selected. Redirecting to directory.');
            switchView('students');
            return;
        }

        // Fill detail fields
        document.getElementById('profile-name').textContent = student.name;
        document.getElementById('profile-roll').textContent = student.roll || 'N/A';
        document.getElementById('profile-center').textContent = student.center || 'N/A';
        document.getElementById('profile-guardian').textContent = student.guardian || 'N/A';
        document.getElementById('profile-phone').textContent = student.guardianPhone || 'N/A';
        document.getElementById('profile-attendance').textContent = student.attendance || '100%';

        // Init profile chart
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('studentProfileChart');
            if (ctx) {
                if (studentProfileProgressChart) studentProfileProgressChart.destroy();
                studentProfileProgressChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Ass. 1', 'Ass. 2', 'Ass. 3', 'Ass. 4'],
                        data: [70, 85, 78, 90],
                        borderColor: '#7C3AED',
                        tension: 0.3
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
    }

    // E. Daily Attendance Tracker
    function renderAttendanceTracker() {
        const students = getStudents();
        const grid = document.querySelector('.attendance-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (students.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; padding:24px;">No students registered yet. Populate your class first.</p>';
            return;
        }

        students.forEach((s, idx) => {
            const card = document.createElement('div');
            card.className = 'glass-card attendance-card';
            card.innerHTML = `
                <h4>${s.name}</h4>
                <p>Roll No: ${s.roll || 'GS-ST-' + (100 + idx)}</p>
                <div class="attendance-options">
                    <div class="attendance-option">
                        <input type="radio" name="att-${idx}" id="att-${idx}-p" value="p" checked>
                        <label for="att-${idx}-p">Present</label>
                    </div>
                    <div class="attendance-option">
                        <input type="radio" name="att-${idx}" id="att-${idx}-a" value="a">
                        <label for="att-${idx}-a">Absent</label>
                    </div>
                    <div class="attendance-option">
                        <input type="radio" name="att-${idx}" id="att-${idx}-l" value="l">
                        <label for="att-${idx}-l">Late</label>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Save Attendance button logic
        const saveAttendanceBtn = document.getElementById('save-attendance-btn');
        if (saveAttendanceBtn) {
            saveAttendanceBtn.replaceWith(saveAttendanceBtn.cloneNode(true));
            document.getElementById('save-attendance-btn').addEventListener('click', () => {
                let absentCount = 0;
                students.forEach((s, idx) => {
                    const isAbsent = document.getElementById(`att-${idx}-a`).checked;
                    if (isAbsent) {
                        absentCount++;
                        // Lower attendance rate dynamically for testing risk triggers
                        s.attendance = '50%';
                    } else {
                        s.attendance = '95%';
                    }
                });
                localStorage.setItem('students', JSON.stringify(students));
                alert(`Attendance saved. ${students.length - absentCount} present, ${absentCount} absent.`);
                renderAttendanceTracker();
            });
        }

        // Render monthly attendance visual graph
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('monthlyAttendanceChart');
            if (ctx) {
                if (monthlyAttendanceChart) monthlyAttendanceChart.destroy();
                monthlyAttendanceChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Present', 'Absent', 'Late'],
                        datasets: [{
                            data: [85, 10, 5],
                            backgroundColor: ['#16A34A', '#DC2626', '#F59E0B']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
    }

    // F. Student Assessments Grading
    function renderAssessments() {
        const assessments = JSON.parse(localStorage.getItem('assessments') || '[]');
        const tbody = document.querySelector('#view-assessments tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        assessments.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.subject}</strong></td>
                <td>${a.studentName}</td>
                <td>${a.marks}</td>
                <td>${a.grade}</td>
                <td>${a.remarks}</td>
            `;
            tbody.appendChild(tr);
        });

        // Grading submission form
        const addGradingBtn = document.getElementById('save-assessment');
        if (addGradingBtn) {
            addGradingBtn.replaceWith(addGradingBtn.cloneNode(true));
            document.getElementById('save-assessment').addEventListener('click', () => {
                const subject = document.getElementById('ass-subject').value.trim();
                const studentName = document.getElementById('ass-student').value.trim();
                const marks = document.getElementById('ass-marks').value.trim();
                const grade = document.getElementById('ass-grade').value.trim();
                const remarks = document.getElementById('ass-remarks').value.trim() || 'Good';

                if (!subject || !studentName || !marks || !grade) {
                    alert('Please enter all subject, student name, marks and grade.');
                    return;
                }

                const assessments = JSON.parse(localStorage.getItem('assessments') || '[]');
                assessments.push({ subject, studentName, marks, grade, remarks });
                localStorage.setItem('assessments', JSON.stringify(assessments));
                renderAssessments();
                alert('Assessment recorded.');

                document.getElementById('ass-subject').value = '';
                document.getElementById('ass-student').value = '';
                document.getElementById('ass-marks').value = '';
                document.getElementById('ass-grade').value = '';
                document.getElementById('ass-remarks').value = '';
            });
        }

        // Render assessment comparison chart
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('assessmentCompChart');
            if (ctx) {
                if (assessmentCompChart) assessmentCompChart.destroy();
                assessmentCompChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Math', 'Science', 'English'],
                        datasets: [{
                            label: 'Class Average',
                            data: [82, 75, 88],
                            backgroundColor: '#2563EB'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
    }

    // G. Dropout Risk Section
    function renderDropoutAlerts() {
        const students = getStudents();
        const tbody = document.querySelector('#view-alerts tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const riskStudents = students.filter(s => parseFloat(s.attendance) < 75);
        if (riskStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">All class attendance is stable. No dropout risks currently detected.</td></tr>';
        } else {
            riskStudents.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.center}</td>
                    <td>${s.attendance}</td>
                    <td><span class="badge badge-risk">High Risk</span></td>
                    <td>
                        <button class="btn-primary btn-sm alert-call-btn" data-phone="${s.guardian}">Call Parent</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.alert-call-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    alert(`Initiating phone call to guardian at ${btn.getAttribute('data-phone')}...`);
                });
            });
        }
    }

    // H. Messages Section
    function renderMessages() {
        const users = getUsers();
        // Load Field supervisors list for messages
        const supervisors = users.filter(u => u.role === 'supervisor');
        const chatList = document.querySelector('.chat-list');
        if (!chatList) return;
        chatList.innerHTML = '';

        if (supervisors.length === 0) {
            chatList.innerHTML = '<p style="padding:12px; font-size:0.8rem; text-align:center;">No supervisors found to contact.</p>';
            document.querySelector('.chat-window').style.display = 'none';
        } else {
            document.querySelector('.chat-window').style.display = 'flex';
            supervisors.forEach((s, idx) => {
                const item = document.createElement('div');
                item.className = `chat-item ${idx === 0 ? 'active' : ''}`;
                item.setAttribute('data-email', s.email);
                item.innerHTML = `
                    <div class="avatar">${s.fullName.charAt(0)}</div>
                    <div class="chat-item-info"><h4>${s.fullName}</h4><p>Supervisor</p></div>
                `;
                chatList.appendChild(item);

                item.addEventListener('click', () => {
                    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    loadChat(s.email, s.fullName);
                });
            });

            if (supervisors[0]) {
                loadChat(supervisors[0].email, supervisors[0].fullName);
            }
        }
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
            chatBox.innerHTML = '<p style="text-align:center; padding:16px;">No message history. Send a greeting message to start!</p>';
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

    const sendChatBtn = document.querySelector('.chat-input button');
    const chatTextInput = document.querySelector('.chat-input input');
    if (sendChatBtn && chatTextInput) {
        sendChatBtn.replaceWith(sendChatBtn.cloneNode(true));
        const cleanSendBtn = document.querySelector('.chat-input button');
        cleanSendBtn.addEventListener('click', () => {
            const chatBoxInput = document.querySelector('.chat-input input');
            const text = chatBoxInput.value.trim();
            if (!text) return;

            const activeChat = document.querySelector('.chat-item.active');
            if (!activeChat) return;
            const targetEmail = activeChat.getAttribute('data-email');

            const messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
            messages.push({
                sender: currentUser.email,
                receiver: targetEmail,
                text,
                timestamp: Date.now()
            });
            localStorage.setItem('chat_messages', JSON.stringify(messages));
            chatBoxInput.value = '';
            loadChat(targetEmail, activeChat.querySelector('h4').textContent);
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
        
        // Teacher sees: All, All Teachers, or specific email target
        const myNotifs = notifs.filter(n => n.target === 'All' || n.target === 'All Teachers' || n.target === currentUser.email);
        
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
            if (n.target === 'All' || n.target === 'All Teachers' || n.target === currentUser.email) {
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

    // Client-side Student Data Exporters
    function exportToExcel(students) {
        console.log('exportToExcel called with students:', students);
        try {
            if (!students || students.length === 0) {
                alert('No student records available to export.');
                return;
            }
            let csv = "Student Name,Roll No,Learning Center,Guardian,Attendance,Status\n";
            students.forEach((s, idx) => {
                const roll = s.roll || 'GS-ST-' + (100 + idx);
                csv += `"${s.name}","${roll}","${s.center}","${s.guardian}","${s.attendance || '100%'}","${s.status || 'Active'}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "student_directory.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('CSV downloaded successfully.');
        } catch (err) {
            alert('Failed to export to Excel: ' + err.message);
            console.error('Excel Export Error:', err);
        }
    }

    function exportToPDF(students) {
        console.log('exportToPDF called with students:', students);
        try {
            if (!students || students.length === 0) {
                alert('No student records available to export.');
                return;
            }

            const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;

            if (jsPDFClass) {
                const doc = new jsPDFClass();
                
                doc.setFontSize(18);
                doc.text("Gyan Shala NGO - Student Directory", 14, 20);
                doc.setFontSize(10);
                doc.text("Generated on: " + new Date().toLocaleDateString(), 14, 28);
                
                const headers = [["Student Name", "Roll No", "Learning Center", "Guardian", "Attendance", "Status"]];
                const data = students.map((s, idx) => [
                    s.name, 
                    s.roll || 'GS-ST-' + (100 + idx), 
                    s.center, 
                    s.guardian, 
                    s.attendance || '100%', 
                    s.status || 'Active'
                ]);
                
                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: 35,
                        head: headers,
                        body: data,
                        theme: 'grid',
                        headStyles: { fillColor: [37, 99, 235] },
                        styles: { fontSize: 9 }
                    });
                } else {
                    console.warn('jspdf-autotable not loaded. Using manual text draw fallback.');
                    let y = 38;
                    doc.setFontSize(9);
                    doc.text("Student Name | Roll No | Learning Center | Guardian | Attendance | Status", 14, y);
                    doc.line(14, y + 2, 196, y + 2);
                    y += 10;
                    data.forEach(row => {
                        doc.text(row.join(" | "), 14, y);
                        y += 8;
                    });
                }
                
                doc.save("student_directory.pdf");
                console.log('PDF saved successfully.');
            } else {
                console.warn('jsPDF library not loaded. Falling back to print view window.');
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                        <head>
                            <title>Student Directory Export</title>
                            <style>
                                body { font-family: sans-serif; padding: 20px; color: #1e293b; }
                                h1 { color: #2563eb; }
                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                                th { background-color: #f8fafc; }
                            </style>
                        </head>
                        <body>
                            <h1>Gyan Shala NGO - Student Directory</h1>
                            <p>Generated on: ${new Date().toLocaleDateString()}</p>
                            <table>
                                <thead>
                                    <tr><th>Student Name</th><th>Roll No</th><th>Learning Center</th><th>Guardian</th><th>Attendance</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    ${students.map((s, idx) => `
                                        <tr>
                                            <td>${s.name}</td>
                                            <td>${s.roll || 'GS-ST-' + (100 + idx)}</td>
                                            <td>${s.center}</td>
                                            <td>${s.guardian}</td>
                                            <td>${s.attendance || '100%'}</td>
                                            <td>${s.status || 'Active'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <script>
                                window.onload = function() { window.print(); window.close(); }
                            </script>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                } else {
                    alert('Popup blocker prevented printing. Please disable popup blocker or connect to the internet to load PDF libraries.');
                }
            }
        } catch (err) {
            alert('Failed to export to PDF: ' + err.message);
            console.error('PDF Export Error:', err);
        }
    }

    const exportExcelBtn = document.getElementById('export-excel-btn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportToExcel(getStudents());
        });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportToPDF(getStudents());
        });
    }

    // I. Teacher Settings View
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

    // J. Teacher Profile details view
    function renderProfile() {
        const infoValues = document.querySelectorAll('#view-profile .info-row .value');
        if (infoValues.length >= 4) {
            infoValues[0].textContent = currentUser.id || 'GS-TCH-45';
            infoValues[1].textContent = currentUser.email;
            infoValues[2].textContent = currentUser.mobile;
            infoValues[3].textContent = `${currentUser.qualification || 'B.Ed'}, ${currentUser.experience || '3'} Years Experience`;
        }
    }

    // K. Help page actions
    function renderHelp() {
        const supportBtn = document.getElementById('submit-support');
        if (supportBtn) {
            supportBtn.replaceWith(supportBtn.cloneNode(true));
            document.getElementById('submit-support').addEventListener('click', () => {
                alert('Support ticket created. Admin office will contact you within 24 hours.');
                document.getElementById('help-msg').value = '';
            });
        }
    }

});
