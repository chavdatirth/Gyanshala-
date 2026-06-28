document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Authentication Session Check (Guard)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'main_office') {
        alert('Access denied. Please login with a Main Office Administrator account.');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }

    // Set Dynamic Date
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    // Populate Top Bar Profile details
    const topBarAvatar = document.querySelector('.top-bar-right .avatar');
    if (topBarAvatar) topBarAvatar.textContent = currentUser.fullName.charAt(0);

    // Sidebar Collapse Logic
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
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

        // Render target page content dynamically
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

    // Google Maps and Supabase instances
    let googleMap = null;
    let googleMapMarkers = [];
    let googleMapClusterer = null;
    let googleSearchMarker = null;
    let googleMyLocationMarker = null;
    let supabaseClient = null;
    let locationsData = []; // Cache for locations loaded from Supabase

    // 3. Dynamic Rendering Engine (View Triggerers)
    function triggerViewRenderer(viewId) {
        switch (viewId) {
            case 'home':
                renderDashboardHome();
                break;
            case 'centers':
                renderCenters();
                break;
            case 'students':
                renderStudents();
                break;
            case 'teachers':
                renderTeachers();
                break;
            case 'supervisors':
                renderSupervisors();
                break;
            case 'volunteers':
                renderVolunteers();
                break;
            case 'parents':
                renderParents();
                break;
            case 'attendance':
                renderAttendance();
                break;
            case 'progress':
                renderProgress();
                break;
            case 'dropout':
                renderDropout();
                break;
            case 'resources':
                renderResources();
                break;
            case 'notifications':
                renderNotifications();
                break;
            case 'reports':
                renderReports();
                break;
            case 'gismap':
                renderGISMap();
                break;
            case 'chatbot':
                renderChatbot();
                break;
            case 'users':
                renderUsers();
                break;
            case 'settings':
                renderSettings();
                break;
            case 'profile':
                renderProfile();
                break;
        }
    }

    // Local Helper to Fetch Users Array
    function getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    // Local Helper to Fetch Students Array
    function getStudents() {
        return JSON.parse(localStorage.getItem('students') || '[]');
    }

    // Dashboard Statistics Calculation
    function renderDashboardHome() {
        const users = getUsers();
        const students = getStudents();
        
        const teacherCount = users.filter(u => u.role === 'teacher').length;
        const supervisorCount = users.filter(u => u.role === 'supervisor').length;
        const volunteerCount = users.filter(u => u.role === 'volunteer').length;
        
        // Dynamic stats update
        document.querySelector('.grid-stats .kpi-card:nth-child(1) .kpi-value h3').textContent = localStorage.getItem('centersCount') || '3';
        document.querySelector('.grid-stats .kpi-card:nth-child(2) .kpi-value h3').textContent = students.length;
        document.querySelector('.grid-stats .kpi-card:nth-child(3) .kpi-value h3').textContent = teacherCount;
        document.querySelector('.grid-stats .kpi-card:nth-child(4) .kpi-value h3').textContent = volunteerCount;
        
        const atRiskCount = students.filter(s => parseFloat(s.attendance) < 75).length;
        document.querySelector('.grid-stats .kpi-card:nth-child(5) .kpi-value h3').textContent = atRiskCount;
        
        // Seed recent activities if none exist
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        if (activities.length === 0) {
            activities.push({ text: 'Standard Class audit completed.', time: '1 hour ago', icon: 'check_circle' });
            activities.push({ text: 'New Learning Center added in South slum.', time: 'Yesterday', icon: 'school' });
            localStorage.setItem('activities', JSON.stringify(activities));
        }

        const activitiesList = document.querySelector('#home-activities');
        if (activitiesList) {
            activitiesList.innerHTML = '';
            activities.slice(0, 5).forEach(act => {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div class="list-item-icon"><span class="material-symbols-rounded">${act.icon}</span></div>
                    <div><strong>${act.text}</strong><p style="margin:0; font-size:0.75rem; color:var(--text-body);">${act.time}</p></div>
                `;
                activitiesList.appendChild(div);
            });
        }
    }

    // Local Helper to Fetch/Seed Learning Centers (using real Ahmedabad coordinates)
    function getLearningCenters() {
        let centers = localStorage.getItem('learning_centers');
        let parsed = null;
        if (centers) {
            try {
                parsed = JSON.parse(centers);
                // Check if they are percentage coordinates (e.g. lat < 100 and lng < 100)
                if (parsed.length > 0 && parsed[0].lat > 0 && parsed[0].lat <= 100 && parsed[0].lng > 0 && parsed[0].lng <= 100) {
                    // Force resetting to realistic Ahmedabad coordinates
                    parsed = null;
                }
            } catch(e) {
                parsed = null;
            }
        }
        if (!parsed) {
            const defaultCenters = [
                { name: 'Sunrise Center', lat: 23.0338, lng: 72.5850, status: 'Healthy', supervisor: 'Not Assigned' },
                { name: 'Hope Hub', lat: 23.0120, lng: 72.5500, status: 'Healthy', supervisor: 'Not Assigned' },
                { name: 'Bright Future', lat: 23.0550, lng: 72.5950, status: 'Warning', supervisor: 'Not Assigned' }
            ];
            localStorage.setItem('learning_centers', JSON.stringify(defaultCenters));
            return defaultCenters;
        }
        return parsed;
    }

    // Learning Centers Section
    function renderCenters() {
        const users = getUsers();
        const teachers = users.filter(u => u.role === 'teacher');
        const students = getStudents();
        const centersList = getLearningCenters();

        // Group students/teachers by center
        const centersMap = {};
        centersList.forEach(c => {
            centersMap[c.name] = { 
                name: c.name, 
                teachersCount: 0, 
                studentsCount: 0, 
                supervisor: c.supervisor || 'Not Assigned', 
                status: c.status || 'Healthy' 
            };
        });

        // Add dynamically registered teachers preferred centers
        teachers.forEach(t => {
            if (t.pref_center) {
                if (!centersMap[t.pref_center]) {
                    centersMap[t.pref_center] = { name: t.pref_center, teachersCount: 0, studentsCount: 0, supervisor: 'Not Assigned', status: 'Healthy' };
                }
                centersMap[t.pref_center].teachersCount++;
            }
        });

        // Add dynamically added students centers
        students.forEach(s => {
            if (s.center) {
                if (!centersMap[s.center]) {
                    centersMap[s.center] = { name: s.center, teachersCount: 0, studentsCount: 0, supervisor: 'Not Assigned', status: 'Healthy' };
                }
                centersMap[s.center].studentsCount++;
            }
        });

        const tbody = document.querySelector('#view-centers tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const finalCenters = Object.values(centersMap);
        localStorage.setItem('centersCount', finalCenters.length);

        finalCenters.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>${c.teachersCount}</td>
                <td>${c.studentsCount}</td>
                <td>${c.supervisor}</td>
                <td><span class="badge ${c.status === 'Healthy' ? 'badge-active' : 'badge-risk'}">${c.status}</span></td>
                <td>
                    <button class="btn-outline btn-sm assign-sup-btn" data-center="${c.name}">Assign Supervisor</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.assign-sup-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const centerName = btn.getAttribute('data-center');
                const supervisors = users.filter(u => u.role === 'supervisor');
                if (supervisors.length === 0) {
                    alert('No registered supervisors found to assign.');
                    return;
                }
                const options = supervisors.map((s, idx) => `${idx + 1}. ${s.fullName}`).join('\n');
                const choice = prompt(`Select a supervisor to assign to ${centerName}:\n${options}`);
                if (choice && supervisors[choice - 1]) {
                    const supervisorName = supervisors[choice - 1].fullName;
                    
                    // Persist assignment in localStorage centers database
                    const curCenters = getLearningCenters();
                    const targetCenter = curCenters.find(c => c.name === centerName);
                    if (targetCenter) {
                        targetCenter.supervisor = supervisorName;
                        localStorage.setItem('learning_centers', JSON.stringify(curCenters));
                    }
                    
                    alert(`Supervisor ${supervisorName} assigned to ${centerName}.`);
                    renderCenters();
                }
            });
        });
    }

    const addCenterBtn = document.querySelector('#view-centers .btn-primary');
    if (addCenterBtn) {
        addCenterBtn.addEventListener('click', () => {
            const name = prompt("Enter Learning Center Name:");
            if (!name) return;
            
            // Randomly position on the visual map coordinate system (15% to 85% to stay clear of edges)
            const lat = Math.floor(Math.random() * 70) + 15;
            const lng = Math.floor(Math.random() * 70) + 15;
            
            const curCenters = getLearningCenters();
            if (curCenters.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                alert(`Learning Center "${name}" already exists.`);
                return;
            }
            
            curCenters.push({
                name: name,
                lat: lat,
                lng: lng,
                status: 'Healthy',
                supervisor: 'Not Assigned'
            });
            
            localStorage.setItem('learning_centers', JSON.stringify(curCenters));
            alert(`Learning Center "${name}" created successfully.`);
            renderCenters();
        });
    }

    // Student Management
    function renderStudents() {
        const students = getStudents();
        const tbody = document.querySelector('#view-students tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px;">No registered students. Click "+ Add Student" in the top bar to create one.</td></tr>';
        } else {
            students.forEach((s, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.roll || 'GS-ST-' + (100 + idx)}</td>
                    <td>${s.center}</td>
                    <td>${s.guardian}</td>
                    <td>${s.attendance}</td>
                    <td><span class="badge ${parseFloat(s.attendance) >= 75 ? 'badge-active' : 'badge-risk'}">${parseFloat(s.attendance) >= 75 ? 'Active' : 'At Risk'}</span></td>
                    <td>
                        <button class="icon-btn delete-student-btn" data-idx="${idx}" style="color:var(--danger); display:inline-flex;"><span class="material-symbols-rounded">delete</span></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.delete-student-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    const students = getStudents();
                    students.splice(idx, 1);
                    localStorage.setItem('students', JSON.stringify(students));
                    renderStudents();
                });
            });
        }
    }

    // Teacher Management
    function renderTeachers() {
        const users = getUsers();
        const teachers = users.filter(u => u.role === 'teacher');
        const tbody = document.querySelector('#view-teachers tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">No teachers registered yet.</td></tr>';
        } else {
            teachers.forEach((t, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${t.fullName}</strong></td>
                    <td>${t.pref_center || 'Not Assigned'}</td>
                    <td>${t.experience ? t.experience + ' Years' : 'N/A'}</td>
                    <td>${t.subjects || 'N/A'}</td>
                    <td><span class="badge badge-active">Approved</span></td>
                    <td>
                        <button class="btn-outline deact-teacher-btn" data-email="${t.email}">Deactivate</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.deact-teacher-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const email = btn.getAttribute('data-email');
                    let users = getUsers();
                    users = users.filter(u => u.email !== email);
                    localStorage.setItem('users', JSON.stringify(users));
                    renderTeachers();
                    alert('Teacher deactivated and removed.');
                });
            });
        }
    }

    // Supervisor Management
    function renderSupervisors() {
        const users = getUsers();
        const supervisors = users.filter(u => u.role === 'supervisor');
        const tbody = document.querySelector('#view-supervisors tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (supervisors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No supervisors registered yet.</td></tr>';
        } else {
            supervisors.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.fullName}</strong></td>
                    <td>${s.city || 'Ahmedabad'}</td>
                    <td>${s.mobile}</td>
                    <td><span class="badge badge-active">Active</span></td>
                    <td><button class="btn-outline">View Reports</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Volunteer Management
    function renderVolunteers() {
        const users = getUsers();
        const volunteers = users.filter(u => u.role === 'volunteer');
        const tbody = document.querySelector('#view-volunteers tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (volunteers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No volunteers registered yet.</td></tr>';
        } else {
            volunteers.forEach(v => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${v.fullName}</strong></td>
                    <td>${v.mobile}</td>
                    <td>${v.email}</td>
                    <td><span class="badge badge-active">Available</span></td>
                    <td><button class="btn-outline">Assign Project</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Parent Directory
    function renderParents() {
        const students = getStudents();
        const tbody = document.querySelector('#view-parents tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;">No parent records linked. Add students to display parent contacts.</td></tr>';
        } else {
            students.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>Guardian of ${s.name}</strong></td>
                    <td>${s.guardian}</td>
                    <td>${s.center}</td>
                    <td><button class="btn-outline">Send Alert Notification</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Attendance Reports
    function renderAttendance() {
        const students = getStudents();
        const tbody = document.querySelector('#view-attendance tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;">No attendance logs available. Add students first.</td></tr>';
        } else {
            students.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.center}</td>
                    <td>${s.attendance}</td>
                    <td><span class="badge ${parseFloat(s.attendance) >= 75 ? 'badge-active' : 'badge-risk'}">${parseFloat(s.attendance) >= 75 ? 'Excellent' : 'Needs Inspection'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Learning Progress
    function renderProgress() {
        const students = getStudents();
        const tbody = document.querySelector('#view-progress tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;">No progress evaluations available.</td></tr>';
        } else {
            students.forEach((s, idx) => {
                const progressScore = (idx % 2 === 0) ? '88%' : '64%';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.center}</td>
                    <td>${progressScore}</td>
                    <td><span class="badge ${parseFloat(progressScore) >= 70 ? 'badge-active' : 'badge-pending'}">${parseFloat(progressScore) >= 70 ? 'On Track' : 'Needs Support'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Dropout Risk Dashboard
    function renderDropout() {
        const students = getStudents();
        const tbody = document.querySelector('#view-dropout tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const criticalStudents = students.filter(s => parseFloat(s.attendance) < 75);
        if (criticalStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No high dropout risk indicators detected. All attendance is stable.</td></tr>';
        } else {
            criticalStudents.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td>${s.center}</td>
                    <td>${s.attendance}</td>
                    <td><span class="badge badge-risk">High Risk</span></td>
                    <td>
                        <button class="btn-primary btn-sm alert-intervention-btn" data-phone="${s.guardian}">Initiate Intervention</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.alert-intervention-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    alert(`Intervention initiated. Alert SMS successfully sent to Guardian at ${btn.getAttribute('data-phone')}`);
                });
            });
        }
    }

    // Resource / Inventory Management
    function renderResources() {
        const resources = JSON.parse(localStorage.getItem('inventory') || '[]');
        if (resources.length === 0) {
            resources.push({ item: 'Std 1 Textbook Packs', stock: 120, type: 'Books' });
            resources.push({ item: 'Learning Tablets', stock: 15, type: 'Digital Devices' });
            resources.push({ item: 'Stationery Boxes', stock: 45, type: 'Stationery' });
            localStorage.setItem('inventory', JSON.stringify(resources));
        }

        const container = document.querySelector('#inventory-grid');
        if (!container) return;
        container.innerHTML = '';

        resources.forEach((r, idx) => {
            const card = document.createElement('div');
            card.className = 'glass-card kpi-card';
            card.innerHTML = `
                <div class="kpi-header">
                    <h4>${r.item}</h4>
                    <span class="badge badge-active">${r.type}</span>
                </div>
                <div class="kpi-value">
                    <h3>${r.stock} Units</h3>
                </div>
                <button class="btn-outline update-stock-btn" data-idx="${idx}">Update Stock</button>
            `;
            container.appendChild(card);
        });

        document.querySelectorAll('.update-stock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.getAttribute('data-idx');
                const inventory = JSON.parse(localStorage.getItem('inventory'));
                const newStock = prompt(`Update stock level for ${inventory[idx].item}:`, inventory[idx].stock);
                if (newStock !== null) {
                    inventory[idx].stock = parseInt(newStock) || 0;
                    localStorage.setItem('inventory', JSON.stringify(inventory));
                    renderResources();
                }
            });
        });
    }

    // Notifications Announcement console
    function renderNotifications() {
        const sendAnnounceBtn = document.getElementById('send-announce');
        if (sendAnnounceBtn) {
            sendAnnounceBtn.replaceWith(sendAnnounceBtn.cloneNode(true)); // remove duplicate events
            document.getElementById('send-announce').addEventListener('click', () => {
                const group = document.getElementById('announce-group').value;
                const msg = document.getElementById('announce-msg').value.trim();
                if (!msg) {
                    alert('Please enter announcement message text.');
                    return;
                }
                
                // Save structured announcement in global notifications array
                const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
                notifs.unshift({
                    id: 'NOTIF-' + Date.now(),
                    target: group, // 'All Teachers', 'All Supervisors', 'All Volunteers', 'All Parents'
                    message: msg,
                    senderName: 'Admin Office',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    readBy: [currentUser.email] // Already read by the admin who created it
                });
                localStorage.setItem('notifications', JSON.stringify(notifs));
                
                alert(`Announcement successfully broadcasted to ${group} and stored in notifications.`);
                document.getElementById('announce-msg').value = '';
                renderNotificationsPanel();
            });
        }
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
        
        const badgeDot = document.querySelector('#notification-btn .badge-dot');
        const unreadCount = notifs.filter(n => !n.readBy || !n.readBy.includes(currentUser.email)).length;
        if (badgeDot) {
            badgeDot.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        panelContent.innerHTML = '';
        if (notifs.length === 0) {
            panelContent.innerHTML = '<p style="text-align:center; padding:20px; font-size:0.85rem; color:var(--text-body);">No notifications</p>';
            return;
        }
        
        notifs.forEach(n => {
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
            if (!n.readBy) n.readBy = [];
            if (!n.readBy.includes(currentUser.email)) {
                n.readBy.push(currentUser.email);
            }
        });
        localStorage.setItem('notifications', JSON.stringify(notifs));
        renderNotificationsPanel();
    }

    // Call dynamic notifications check on load
    renderNotificationsPanel();

    // Client-side Student Data Exporters
    function exportToExcel(students) {
        console.log('Admin: exportToExcel called with students:', students);
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
            console.log('Admin: CSV downloaded successfully.');
        } catch (err) {
            alert('Failed to export to Excel: ' + err.message);
            console.error('Admin Excel Export Error:', err);
        }
    }

    function exportToPDF(students) {
        console.log('Admin: exportToPDF called with students:', students);
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
                    console.warn('Admin: jspdf-autotable not loaded. Using manual text draw fallback.');
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
                console.log('Admin: PDF saved successfully.');
            } else {
                console.warn('Admin: jsPDF library not loaded. Falling back to print view window.');
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
            console.error('Admin PDF Export Error:', err);
        }
    }

    const exportExcelBtn = document.getElementById('admin-export-excel-btn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportToExcel(getStudents());
        });
    }

    const exportPdfBtn = document.getElementById('admin-export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportToPDF(getStudents());
        });
    }

    // Generated reports page
    function renderReports() {
        // Aesthetic mock button alerts
        document.querySelectorAll('#view-reports .btn-primary').forEach(btn => {
            btn.addEventListener('click', () => {
                alert('Report generated. Your PDF/Excel download will begin shortly.');
            });
        });
    }

    // ==========================================
    // GOOGLE MAPS & SUPABASE REAL-TIME GIS SYSTEM
    // ==========================================

    // Dynamic Script Loader for Google Maps
    function loadGoogleMapsScript(apiKey) {
        return new Promise((resolve, reject) => {
            if (window.google && window.google.maps) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
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

        // Local file:/// protocol CORS override fallback
        if (location.protocol === 'file:') {
            console.warn('File protocol detected. Restoring configuration values from LocalStorage.');
            env.VITE_GOOGLE_MAPS_API_KEY = localStorage.getItem('VITE_GOOGLE_MAPS_API_KEY') || '';
            env.VITE_SUPABASE_URL = localStorage.getItem('VITE_SUPABASE_URL') || '';
            env.VITE_SUPABASE_ANON_KEY = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '';

            if (!env.VITE_GOOGLE_MAPS_API_KEY) {
                const key = prompt("Local File detected. Please input your Google Maps API Key to load GIS:");
                if (key) {
                    localStorage.setItem('VITE_GOOGLE_MAPS_API_KEY', key);
                    env.VITE_GOOGLE_MAPS_API_KEY = key;
                }
            }
            if (!env.VITE_SUPABASE_URL) {
                const url = prompt("Please enter your Supabase URL (or Cancel for Offline mode):");
                if (url) {
                    localStorage.setItem('VITE_SUPABASE_URL', url);
                    env.VITE_SUPABASE_URL = url;
                    const anon = prompt("Please enter your Supabase Anon Key:");
                    if (anon) {
                        localStorage.setItem('VITE_SUPABASE_ANON_KEY', anon);
                        env.VITE_SUPABASE_ANON_KEY = anon;
                    }
                }
            }
        }
        return env;
    }

    // Initialize GIS Client systems
    let envConfig = null;
    async function initializeGISSystem() {
        envConfig = await loadEnv();

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
            } catch (err) {
                console.error('Google Maps Load Error:', err);
                showGoogleMapsErrorPlaceholder('Library script load failed.');
            }
        } else {
            showGoogleMapsErrorPlaceholder('API key not configured in .env file.');
        }
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
                        updateGisAnalytics();
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

    // Save Location (Insert or Update)
    async function saveLocationToDatabase(loc) {
        try {
            if (supabaseClient) {
                if (loc.id) {
                    const { error } = await supabaseClient
                        .from('gis_locations')
                        .update({
                            type: loc.type,
                            name: loc.name,
                            address: loc.address,
                            latitude: parseFloat(loc.latitude),
                            longitude: parseFloat(loc.longitude),
                            teacher: loc.teacher,
                            capacity: parseInt(loc.capacity) || 0,
                            contact: loc.contact,
                            photo_url: loc.photo_url,
                            status: loc.status
                        })
                        .eq('id', loc.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabaseClient
                        .from('gis_locations')
                        .insert([{
                            type: loc.type,
                            name: loc.name,
                            address: loc.address,
                            latitude: parseFloat(loc.latitude),
                            longitude: parseFloat(loc.longitude),
                            teacher: loc.teacher,
                            capacity: parseInt(loc.capacity) || 0,
                            contact: loc.contact,
                            photo_url: loc.photo_url,
                            status: loc.status
                        }]);
                    if (error) throw error;
                }
            } else {
                let mockDb = JSON.parse(localStorage.getItem('supabase_gis_locations_mock') || '[]');
                if (loc.id) {
                    mockDb = mockDb.map(l => l.id === loc.id ? { ...l, ...loc, updated_at: new Date().toISOString() } : l);
                } else {
                    const newLoc = {
                        ...loc,
                        id: 'LOC-' + Date.now(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    mockDb.push(newLoc);
                }
                localStorage.setItem('supabase_gis_locations_mock', JSON.stringify(mockDb));
            }

            await loadLocationsFromDatabase();
            renderMarkersOnGoogleMap();
            updateGisAnalytics();
            alert('Location successfully committed.');
        } catch (err) {
            alert('Save operation failed: ' + err.message);
            console.error(err);
        }
    }

    // Delete Location
    async function deleteLocationFromDatabase(id) {
        if (!confirm('Are you sure you want to delete this location?')) return;
        try {
            if (supabaseClient) {
                const { error } = await supabaseClient.from('gis_locations').delete().eq('id', id);
                if (error) throw error;
            } else {
                let mockDb = JSON.parse(localStorage.getItem('supabase_gis_locations_mock') || '[]');
                mockDb = mockDb.filter(l => l.id !== id);
                localStorage.setItem('supabase_gis_locations_mock', JSON.stringify(mockDb));
            }

            await loadLocationsFromDatabase();
            renderMarkersOnGoogleMap();
            updateGisAnalytics();
            alert('Location deleted successfully.');
        } catch (err) {
            alert('Failed to delete location: ' + err.message);
            console.error(err);
        }
    }

    // Google Maps Initializer
    async function renderGISMap() {
        const mapContainer = document.getElementById('google-map-container');
        if (!mapContainer) return;

        // Verify script states
        if (!envConfig) {
            await initializeGISSystem();
        }

        if (!window.google || !window.google.maps) {
            showGoogleMapsErrorPlaceholder();
            return;
        }

        // Initialize Map Control once
        if (!googleMap) {
            console.log('Rendering Google Map controls...');
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

            // Click listener for coordinates creation
            googleMap.addListener('click', (e) => {
                openAddLocationModal(e.latLng.lat(), e.latLng.lng());
            });

            // Wire helpers
            setupGooglePlacesAutocomplete();
            setupMapFilters();
            setupMyLocationButton();
            setupModalFormHandler();
        }

        // Render markers
        renderMarkersOnGoogleMap();
        updateGisAnalytics();
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

    // Analytics Counter values
    function updateGisAnalytics() {
        let offices = 0;
        let centers = 0;
        let classrooms = 0;
        let teachers = 0;
        let students = 0;
        let riskAreas = 0;

        locationsData.forEach(loc => {
            if (loc.type === 'Main Office') offices++;
            if (loc.type === 'Learning Center') centers++;
            if (loc.type === 'Classroom') classrooms++;
            if (loc.type === 'Risk Area') riskAreas++;

            if (loc.capacity) students += parseInt(loc.capacity) || 0;
            if (loc.teacher) teachers++;
        });

        const officeEl = document.getElementById('gis-stat-main-offices');
        const centerEl = document.getElementById('gis-stat-learning-centers');
        const classEl = document.getElementById('gis-stat-classrooms');
        const teacherEl = document.getElementById('gis-stat-teachers');
        const studentEl = document.getElementById('gis-stat-students');
        const riskEl = document.getElementById('gis-stat-risk-areas');

        if (officeEl) officeEl.textContent = offices;
        if (centerEl) centerEl.textContent = centers;
        if (classEl) classEl.textContent = classrooms;
        if (teacherEl) teacherEl.textContent = teachers;
        if (studentEl) studentEl.textContent = students;
        if (riskEl) riskEl.textContent = riskAreas;
    }

    // Marker Click Popups & Canvas drawings
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
                position: { lat: loc.latitude, lng: loc.longitude },
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
                            <button id="btn-edit-${loc.id}" style="flex:1; padding:6px; font-size:0.75rem; font-weight:600; border:1px solid #CBD5E1; background:white; color:#334155; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:14px;">edit</span> Edit</button>
                            <button id="btn-delete-${loc.id}" style="padding:6px; font-size:0.75rem; font-weight:600; border:1px solid #FEE2E2; background:#FEF2F2; color:#EF4444; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:14px;">delete</span> Delete</button>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank" style="flex:1; padding:6px; font-size:0.75rem; font-weight:600; border:none; background:#2563EB; color:white; border-radius:6px; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:14px;">navigation</span> Go</a>
                        </div>
                    </div>
                `
            });

            // Markers click popup opener
            marker.addListener('click', () => {
                infoWindow.open(googleMap, marker);
            });

            // Bind click operations inside info popup
            google.maps.event.addListener(infoWindow, 'domready', () => {
                const editBtn = document.getElementById(`btn-edit-${loc.id}`);
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        infoWindow.close();
                        openEditLocationModal(loc);
                    });
                }

                const delBtn = document.getElementById(`btn-delete-${loc.id}`);
                if (delBtn) {
                    delBtn.addEventListener('click', () => {
                        infoWindow.close();
                        deleteLocationFromDatabase(loc.id);
                    });
                }
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

    // Reverse Geocoding Address Fetchers
    function openAddLocationModal(lat, lng) {
        document.getElementById('gis-modal-title').textContent = 'Add New Location';
        document.getElementById('gis-location-id').value = '';
        document.getElementById('gis-lat').value = lat;
        document.getElementById('gis-lng').value = lng;
        document.getElementById('gis-name').value = '';
        document.getElementById('gis-address').value = 'Fetching address...';
        document.getElementById('gis-teacher').value = '';
        document.getElementById('gis-contact').value = '';
        document.getElementById('gis-capacity').value = '';
        document.getElementById('gis-type').value = 'Learning Center';
        document.getElementById('gis-status').value = 'Healthy';
        document.getElementById('gis-photo-url').value = '';
        document.getElementById('gis-photo-file').value = '';
        document.getElementById('gis-photo-preview-container').style.display = 'none';

        const modal = document.getElementById('gis-location-modal');
        if (modal) modal.classList.add('active');

        // Trigger Geocoding Geoloader
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                document.getElementById('gis-address').value = results[0].formatted_address;
            } else {
                document.getElementById('gis-address').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        });
    }

    // Modal Edit loader
    function openEditLocationModal(loc) {
        document.getElementById('gis-modal-title').textContent = 'Edit Location';
        document.getElementById('gis-location-id').value = loc.id;
        document.getElementById('gis-lat').value = loc.latitude;
        document.getElementById('gis-lng').value = loc.longitude;
        document.getElementById('gis-name').value = loc.name;
        document.getElementById('gis-address').value = loc.address;
        document.getElementById('gis-teacher').value = loc.teacher || '';
        document.getElementById('gis-contact').value = loc.contact || '';
        document.getElementById('gis-capacity').value = loc.capacity || '';
        document.getElementById('gis-type').value = loc.type;
        document.getElementById('gis-status').value = loc.status || 'Healthy';
        document.getElementById('gis-photo-url').value = loc.photo_url || '';
        document.getElementById('gis-photo-file').value = '';

        if (loc.photo_url) {
            document.getElementById('gis-photo-preview').src = loc.photo_url;
            document.getElementById('gis-photo-preview-container').style.display = 'block';
        } else {
            document.getElementById('gis-photo-preview-container').style.display = 'none';
        }

        const modal = document.getElementById('gis-location-modal');
        if (modal) modal.classList.add('active');
    }

    // Modal forms bindings
    function setupModalFormHandler() {
        const form = document.getElementById('gis-location-form');
        const cancelBtn = document.getElementById('btn-gis-modal-cancel');
        const photoFile = document.getElementById('gis-photo-file');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('gis-location-id').value;
                const type = document.getElementById('gis-type').value;
                const name = document.getElementById('gis-name').value.trim();
                const address = document.getElementById('gis-address').value.trim();
                const latitude = parseFloat(document.getElementById('gis-lat').value);
                const longitude = parseFloat(document.getElementById('gis-lng').value);
                const teacher = document.getElementById('gis-teacher').value.trim();
                const contact = document.getElementById('gis-contact').value.trim();
                const capacity = parseInt(document.getElementById('gis-capacity').value) || 0;
                const status = document.getElementById('gis-status').value;
                const photo_url = document.getElementById('gis-photo-url').value;

                const saveBtn = document.getElementById('btn-gis-modal-save');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                await saveLocationToDatabase({
                    id: id || undefined,
                    type,
                    name,
                    address,
                    latitude,
                    longitude,
                    teacher,
                    contact,
                    capacity,
                    status,
                    photo_url
                });

                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Location';

                const modal = document.getElementById('gis-location-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const modal = document.getElementById('gis-location-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        if (photoFile) {
            photoFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (file.size > 2 * 1024 * 1024) {
                    alert('Images must be smaller than 2MB.');
                    photoFile.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('gis-photo-url').value = evt.target.result;
                    document.getElementById('gis-photo-preview').src = evt.target.result;
                    document.getElementById('gis-photo-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(file);
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
                initializeGISSystem().then(() => {
                    renderGISMap();
                });
            });
        }
    }

    // Initialize environment loader immediately at page startup
    initializeGISSystem();

    // Chatbot Logs viewer
    function renderChatbot() {
        const tbody = document.querySelector('#view-chatbot tbody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr><td>User (Parent)</td><td>How do I check my child's progress report?</td><td>AI Response (Directions provided)</td><td><span class="badge badge-active">Resolved</span></td></tr>
            <tr><td>User (Volunteer)</td><td>Available weekend projects near अहमदाबाद?</td><td>AI Response (Listed slots)</td><td><span class="badge badge-active">Resolved</span></td></tr>
        `;
    }

    // Admin User Management / Approvals View
    function renderUsers() {
        const users = getUsers();
        const tbody = document.querySelector('#view-users tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.fullName}</strong></td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td><span class="badge badge-active">Active</span></td>
                <td>
                    <button class="btn-outline delete-user-btn" data-email="${u.email}" style="color:var(--danger); border-color:var(--danger);">Deactivate</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-email');
                if (email === currentUser.email) {
                    alert('You cannot deactivate your own administrative account.');
                    return;
                }
                let users = getUsers();
                users = users.filter(u => u.email !== email);
                localStorage.setItem('users', JSON.stringify(users));
                renderUsers();
                alert('User de-activated.');
            });
        });
    }

    // Settings Toggle Handler
    function renderSettings() {
        const themeToggle = document.getElementById('dark-theme-toggle');
        if (themeToggle) {
            // Match checkbox state with body class
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

    // Admin Profile Page
    function renderProfile() {
        const profileAvatar = document.querySelector('.profile-large-avatar');
        if (profileAvatar) profileAvatar.textContent = currentUser.fullName.charAt(0);

        const profileName = document.querySelector('.profile-card h2');
        if (profileName) profileName.textContent = currentUser.fullName;

        const infoValues = document.querySelectorAll('#view-profile .info-row .value');
        if (infoValues.length >= 3) {
            infoValues[0].textContent = currentUser.email;
            infoValues[1].textContent = currentUser.mobile;
            infoValues[2].textContent = `${currentUser.city}, ${currentUser.state}`;
        }
    }

    // Quick Action Form Handlers
    const quickAddStudentBtn = document.getElementById('quick-add-student');
    if (quickAddStudentBtn) {
        quickAddStudentBtn.addEventListener('click', () => {
            const name = prompt("Enter Student Full Name:");
            if (!name) return;
            const center = prompt("Enter Learning Center Name (e.g. Sunrise Center):");
            if (!center) return;
            const guardian = prompt("Enter Guardian Mobile Number:");
            if (!guardian) return;
            
            const students = getStudents();
            students.push({ name, roll: 'GS-ST-' + (100 + students.length), center, guardian, attendance: '92%', status: 'Active' });
            localStorage.setItem('students', JSON.stringify(students));
            
            // Add activity logger entry
            const activities = JSON.parse(localStorage.getItem('activities') || '[]');
            activities.unshift({ text: `Student ${name} added.`, time: 'Just now', icon: 'person_add' });
            localStorage.setItem('activities', JSON.stringify(activities));

            // Reload active views
            renderStudents();
            renderDashboardHome();
            alert(`Student ${name} added successfully.`);
        });
    }

    const quickAddTeacherBtn = document.getElementById('quick-add-teacher');
    if (quickAddTeacherBtn) {
        quickAddTeacherBtn.addEventListener('click', () => {
            const fullName = prompt("Enter Teacher Full Name:");
            if (!fullName) return;
            const email = prompt("Enter Email Address:");
            if (!email) return;
            const pref_center = prompt("Enter Preferred Learning Center (e.g. Sunrise Center):");
            if (!pref_center) return;
            
            const users = getUsers();
            users.push({
                fullName,
                email,
                role: 'teacher',
                pref_center,
                experience: '2',
                subjects: 'Math',
                approved: true
            });
            localStorage.setItem('users', JSON.stringify(users));

            // Add activity logger entry
            const activities = JSON.parse(localStorage.getItem('activities') || '[]');
            activities.unshift({ text: `Teacher ${fullName} joined.`, time: 'Just now', icon: 'person_add' });
            localStorage.setItem('activities', JSON.stringify(activities));

            // Reload active views
            renderTeachers();
            renderDashboardHome();
            alert(`Teacher ${fullName} registered successfully.`);
        });
    }

    // Global Floating Assistant Event
    const assistantBtn = document.querySelector('.ai-assistant-btn');
    if (assistantBtn) {
        assistantBtn.addEventListener('click', () => {
            alert('AI Assistant: All NGO systems are healthy. Attendance today averages 91%.');
        });
    }

});
