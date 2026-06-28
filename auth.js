// auth.js - Gyan Shala NGO Authentication System Manager

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
        if (lower.includes('success') || lower.includes('complete') || lower.includes('committed') || lower.includes('broadcasted') || lower.includes('healthy') || lower.includes('saved')) {
            type = 'success';
        } else if (lower.includes('failed') || lower.includes('denied') || lower.includes('invalid') || lower.includes('error') || lower.includes('cannot') || lower.includes('must') || lower.includes('aborted') || lower.includes('wrong')) {
            type = 'error';
        } else if (lower.includes('warning') || lower.includes('attention') || lower.includes('blocker') || lower.includes('prevented') || lower.includes('de-activated') || lower.includes('deactivated')) {
            type = 'warning';
        }
        showToast(message, type);
    };

    // Environment variables loader
    let envConfig = {
        VITE_EMAILJS_SERVICE_ID: 'service_bjim45r',
        VITE_EMAILJS_TEMPLATE_ID: 'template_9omfz1h'
    };

    async function loadEnv() {
        try {
            const res = await fetch('.env');
            if (res.ok) {
                const text = await res.text();
                text.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                        if (key.startsWith('VITE_EMAILJS_')) {
                            envConfig[key] = val;
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Could not read .env file. Using defaults.');
        }
        
        // localStorage fallbacks for local file protocol
        if (location.protocol === 'file:') {
            envConfig.VITE_EMAILJS_SERVICE_ID = localStorage.getItem('VITE_EMAILJS_SERVICE_ID') || envConfig.VITE_EMAILJS_SERVICE_ID;
            envConfig.VITE_EMAILJS_TEMPLATE_ID = localStorage.getItem('VITE_EMAILJS_TEMPLATE_ID') || envConfig.VITE_EMAILJS_TEMPLATE_ID;
        }
    }
    loadEnv();

    // DOM Element Queries
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const strengthBar = document.getElementById('password-strength');
    const strengthText = document.getElementById('strength-text');

    // Auto-select role from URL query parameter (e.g. ?role=volunteer)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    const roleSelect = document.getElementById('role');
    if (roleSelect && roleParam) {
        roleSelect.value = roleParam;
    }
    
    // Register Multi-step Wizard Nodes
    const step1Panel = document.getElementById('register-step-1');
    const step2Panel = document.getElementById('register-step-2');
    const step3Panel = document.getElementById('register-step-3');
    
    const step1ContinueBtn = document.getElementById('btn-step-1-continue');
    const step2BackBtn = document.getElementById('btn-step-2-back');
    const step2VerifyBtn = document.getElementById('btn-step-2-verify');
    
    const registerTitle = document.getElementById('register-title');
    const registerSubtitle = document.getElementById('register-subtitle');

    // Google Role Selector Nodes
    const googleBtn = document.querySelector('.btn-google');
    const googleRoleModal = document.getElementById('google-role-modal');
    const modalCancelBtn = document.getElementById('btn-modal-cancel');
    const modalContinueBtn = document.getElementById('btn-modal-continue');

    // Initialize clean session store for registration OTP flows
    sessionStorage.removeItem('reg_otp');
    sessionStorage.removeItem('reg_otp_verified');

    // ==========================================
    // Hide/Show Password toggle listener
    // ==========================================
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const wrapper = toggle.closest('.password-wrapper');
            const input = wrapper.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                toggle.textContent = 'Hide';
            } else {
                input.type = 'password';
                toggle.textContent = 'Show';
            }
        });
    });

    // ==========================================
    // Password Strength Meter Listener
    // ==========================================
    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', () => {
            const pass = passwordInput.value;
            let score = 0;
            
            if (pass.length >= 8) score++;
            if (/[A-Z]/.test(pass)) score++;
            if (/[0-9]/.test(pass)) score++;
            if (/[^A-Za-z0-9]/.test(pass)) score++;

            strengthBar.className = 'password-strength';
            if (pass.length === 0) {
                strengthText.textContent = '';
            } else if (score <= 1) {
                strengthBar.classList.add('strength-weak');
                strengthText.textContent = 'Weak';
                strengthText.style.color = '#DC2626';
            } else if (score <= 3) {
                strengthBar.classList.add('strength-medium');
                strengthText.textContent = 'Medium';
                strengthText.style.color = '#F59E0B';
            } else {
                strengthBar.classList.add('strength-strong');
                strengthText.textContent = 'Strong';
                strengthText.style.color = '#10B981';
            }
        });
    }

    // ==========================================
    // REGISTRATION 3-STEP WIZARD LOGIC
    // ==========================================
    
    // Step 1 -> Step 2 transition
    if (step1ContinueBtn) {
        step1ContinueBtn.addEventListener('click', () => {
            const name = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const emailInput = document.getElementById('email');

            if (!name) {
                alert('Please enter your full name.');
                return;
            }
            if (!email || !emailInput.checkValidity()) {
                alert('Please enter a valid email address.');
                return;
            }

            // Generate random 6-digit OTP code
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('reg_otp', otpCode);
            sessionStorage.setItem('reg_otp_verified', 'false');

            // Trigger EmailJS verification send
            if (typeof emailjs !== 'undefined') {
                emailjs.send(envConfig.VITE_EMAILJS_SERVICE_ID, envConfig.VITE_EMAILJS_TEMPLATE_ID, {
                    name: name,
                    email: email,
                    to_email: email, // maps to {{to_email}} parameter in EmailJS settings
                    otp: otpCode
                })
                .then(() => {
                    alert(`An OTP verification email has been dispatched to ${email}. Please check your inbox.`);
                    
                    // Shift Step views
                    step1Panel.classList.remove('active');
                    step2Panel.classList.add('active');
                    registerSubtitle.textContent = 'Step 2 of 3: Email Verification';
                })
                .catch((error) => {
                    // Safe fallback alert containing OTP if credentials/limits fail
                    alert(`[EmailJS Delivery Warning: ${error.text || error}]\n\nFallback OTP: ${otpCode}`);
                    console.error('EmailJS Error:', error);
                    
                    // Shift Step views
                    step1Panel.classList.remove('active');
                    step2Panel.classList.add('active');
                    registerSubtitle.textContent = 'Step 2 of 3: Email Verification';
                });
            } else {
                // If offline/no library loaded, alert the OTP code directly
                alert(
                    `[Gyan Shala NGO Secure Email Portal - Offline Fallback]\n\n` +
                    `An email verification request was created for: ${email}\n\n` +
                    `Your 6-Digit verification code (OTP) is: ${otpCode}`
                );
                
                // Shift Step views
                step1Panel.classList.remove('active');
                step2Panel.classList.add('active');
                registerSubtitle.textContent = 'Step 2 of 3: Email Verification';
            }
        });
    }

    // Step 2 Back transition
    if (step2BackBtn) {
        step2BackBtn.addEventListener('click', () => {
            step2Panel.classList.remove('active');
            step1Panel.classList.add('active');
            registerSubtitle.textContent = 'Step 1 of 3: Personal Information';
        });
    }

    // Step 2 Verify OTP -> Step 3 transition
    if (step2VerifyBtn) {
        step2VerifyBtn.addEventListener('click', () => {
            const otpVal = document.getElementById('otp-input').value.trim();
            const storedOtp = sessionStorage.getItem('reg_otp');

            if (otpVal === storedOtp && storedOtp) {
                sessionStorage.setItem('reg_otp_verified', 'true');
                
                // Shift to step 3 (Passwords are revealed only now!)
                step2Panel.classList.remove('active');
                step3Panel.classList.add('active');
                registerSubtitle.textContent = 'Step 3 of 3: Choose Role & Create Password';
            } else {
                alert('Invalid verification code. Please check code and try again.');
            }
        });
    }

    // Submit Step 3 Form Submission
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Guard: Check email is verified
            if (sessionStorage.getItem('reg_otp_verified') !== 'true') {
                alert('Please request and verify your email verification OTP code first.');
                return;
            }

            const password = passwordInput.value;
            const confirmPass = confirmPasswordInput.value;
            const role = document.getElementById('role').value;
            const terms = document.getElementById('terms').checked;

            if (password.length < 8) {
                alert('Password must be at least 8 characters long.');
                return;
            }
            if (password !== confirmPass) {
                alert('Passwords do not match. Please verify passwords.');
                return;
            }
            if (!role) {
                alert('Please select your smart education role.');
                return;
            }
            if (!terms) {
                alert('You must accept terms and conditions.');
                return;
            }

            const spinner = registerForm.querySelector('.spinner');
            const btnText = registerForm.querySelector('.btn-text');
            if (spinner) spinner.style.display = 'block';
            if (btnText) btnText.textContent = 'Registering...';

            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const email = document.getElementById('email').value.trim();

                // Double check registry clash
                if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                    alert('This email address is already registered.');
                    if (spinner) spinner.style.display = 'none';
                    if (btnText) btnText.textContent = 'Create Account';
                    return;
                }

                // Register user details
                const newUser = {
                    id: 'USER-' + Date.now(),
                    fullName: document.getElementById('fullName').value.trim(),
                    email: email,
                    mobile: '9876543210',
                    dob: '1990-01-01',
                    gender: 'Male',
                    role: role,
                    address: '',
                    area: '',
                    city: 'Ahmedabad',
                    state: 'Gujarat',
                    pincode: '',
                    password: password,
                    approved: true
                };

                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(newUser));

                sessionStorage.removeItem('reg_otp');
                sessionStorage.removeItem('reg_otp_verified');

                alert('Account created successfully!');
                
                // Redirect depending on chosen role
                if (role === 'main_office') {
                    window.location.href = 'admin-dashboard.html';
                } else if (role === 'supervisor') {
                    window.location.href = 'dashboard.html';
                } else if (role === 'teacher') {
                    window.location.href = 'teacher-dashboard.html';
                } else if (role === 'volunteer') {
                    window.location.href = 'volunteer-dashboard.html';
                }
            }, 1000);
        });
    }

    // ==========================================
    // REGULAR LOGIN FORM SUBMISSION LOGIC
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            const spinner = loginForm.querySelector('.spinner');
            const btnText = loginForm.querySelector('.btn-text');
            if (spinner) spinner.style.display = 'block';
            if (btnText) btnText.textContent = 'Signing In...';

            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                
                // Query match
                const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
                
                if (matchedUser) {
                    localStorage.setItem('currentUser', JSON.stringify(matchedUser));
                    
                    // Direct depending on role
                    if (matchedUser.role === 'main_office') {
                        window.location.href = 'admin-dashboard.html';
                    } else if (matchedUser.role === 'supervisor') {
                        window.location.href = 'dashboard.html';
                    } else if (matchedUser.role === 'teacher') {
                        window.location.href = 'teacher-dashboard.html';
                    } else if (matchedUser.role === 'volunteer') {
                        window.location.href = 'volunteer-dashboard.html';
                    }
                } else {
                    alert('Invalid email or password. Please try again.');
                    if (spinner) spinner.style.display = 'none';
                    if (btnText) btnText.textContent = 'Sign In';
                }
            }, 800);
        });
    }

    // ==========================================
    // OFFICIAL GOOGLE SIGN-IN ON LOGIN PAGE
    // ==========================================
    let googleTempUser = null;

    // Decode JWT helper
    function decodeJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    // Google Credential Callback
    window.handleGoogleLoginResponse = function(response) {
        try {
            const payload = decodeJwt(response.credential);
            console.log("Real Google Profile:", payload);

            googleTempUser = {
                id: 'USER-G-' + Date.now(),
                fullName: payload.name,
                email: payload.email,
                mobile: '9876543210',
                dob: '1995-01-01',
                gender: 'Male',
                address: '',
                area: '',
                city: 'Ahmedabad',
                state: 'Gujarat',
                pincode: '',
                picture: payload.picture || '',
                approved: true
            };

            // Show the role selection modal overlay
            if (googleRoleModal) {
                googleRoleModal.classList.add('active');
            } else {
                alert('Role selector modal missing.');
            }

        } catch (e) {
            console.error("Google login callback error:", e);
            alert("Google Sign-In response decoding failed.");
        }
    };

    async function initPageGoogleSignIn() {
        if (document.getElementById('google-btn-container')) {
            // Load environment variables
            let clientID = '510621809360-hpj4i8b8i0mo10ua602rblnndl6f06gl.apps.googleusercontent.com';
            try {
                const res = await fetch('.env');
                if (res.ok) {
                    const text = await res.text();
                    text.split('\n').forEach(line => {
                        const parts = line.split('=');
                        if (parts.length >= 2 && parts[0].trim() === 'VITE_GOOGLE_CLIENT_ID') {
                            clientID = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                        }
                    });
                }
            } catch (e) {
                console.warn('Skipped reading .env clientID, using default.');
            }

            if (typeof google !== 'undefined') {
                google.accounts.id.initialize({
                    client_id: clientID,
                    callback: window.handleGoogleLoginResponse,
                    auto_select: true
                });
                
                // Calculate card-relative responsive width
                let btnWidth = 370;
                const cardEl = document.querySelector('.auth-card');
                if (cardEl) {
                    const padding = window.innerWidth < 600 ? 48 : 80;
                    btnWidth = Math.min(370, Math.max(200, cardEl.clientWidth - padding));
                }

                google.accounts.id.renderButton(
                    document.getElementById("google-btn-container"),
                    { theme: "outline", size: "large", width: btnWidth }
                );
                google.accounts.id.prompt();

                // Append local file:/// protocol safety check warning
                if (location.protocol === 'file:') {
                    const btnContainer = document.getElementById("google-btn-container");
                    if (btnContainer && !document.getElementById('google-file-warning')) {
                        const warningMsg = document.createElement('div');
                        warningMsg.id = 'google-file-warning';
                        warningMsg.style.color = '#ef4444';
                        warningMsg.style.fontSize = '0.8rem';
                        warningMsg.style.marginTop = '-16px';
                        warningMsg.style.marginBottom = '16px';
                        warningMsg.style.textAlign = 'center';
                        warningMsg.style.fontWeight = '500';
                        warningMsg.style.lineHeight = '1.4';
                        warningMsg.innerHTML = '⚠️ Google Sign-In requires a local web server (cannot run from file:/// browser URL).';
                        btnContainer.parentNode.insertBefore(warningMsg, btnContainer.nextSibling);
                    }
                }
            }
        }
    }

    // Modal Action Listeners
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (googleRoleModal) googleRoleModal.classList.remove('active');
            googleTempUser = null;
        });
    }

    if (modalContinueBtn) {
        modalContinueBtn.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="google-role"]:checked');
            
            if (!selectedRadio) {
                alert('Please select exactly one role before continuing.');
                return;
            }
            if (!googleTempUser) {
                alert('Credentials lost. Please sign in again.');
                return;
            }

            const chosenRole = selectedRadio.value;
            googleTempUser.role = chosenRole;

            // Save user in local users database
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            let userObj = users.find(u => u.email.toLowerCase() === googleTempUser.email.toLowerCase());
            
            if (!userObj) {
                userObj = googleTempUser;
                users.push(userObj);
                localStorage.setItem('users', JSON.stringify(users));
            } else {
                userObj.role = chosenRole;
                if (googleTempUser.picture) {
                    userObj.picture = googleTempUser.picture;
                }
                localStorage.setItem('users', JSON.stringify(users));
            }

            localStorage.setItem('currentUser', JSON.stringify(userObj));
            if (googleRoleModal) googleRoleModal.classList.remove('active');

            alert(`Logged in with Google as ${userObj.fullName}!`);

            // Route to correct dashboard
            if (chosenRole === 'main_office') {
                window.location.href = 'admin-dashboard.html';
            } else if (chosenRole === 'supervisor') {
                window.location.href = 'dashboard.html';
            } else if (chosenRole === 'teacher') {
                window.location.href = 'teacher-dashboard.html';
            } else if (chosenRole === 'volunteer') {
                window.location.href = 'volunteer-dashboard.html';
            }
        });
    }

    // Trigger after DOM loaded & SDK ready
    setTimeout(() => {
        initPageGoogleSignIn();
    }, 500);
});
