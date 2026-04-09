// Wrap everything in a block scope to prevent "already declared" variable conflicts
{
// auth-config.js
// Placeholders for your Supabase Project details. 
// Replace these with your actual Supabase URL and Anon Key from your project settings.
// const SUPABASE_URL = 'YOUR_SUPABASE_URL';
// const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Initialize the Supabase client
// const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utility: Create the Glassmorphic Login Modal
function createLoginModal() {
    // Prevent duplicate modals
    if (document.getElementById('auth-modal')) return;

    const modalHTML = `
        <div id="auth-modal" class="auth-modal-overlay">
            <div class="auth-modal-content">
                <button class="auth-close-btn" onclick="closeLoginModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div class="auth-header">
                    <h2>Welcome to Luxe</h2>
                    <p>Sign in to access your collective and secure your sample.</p>
                </div>
                
                <style>
                    .auth-provider-btn {
                        width: 100%;
                        padding: 1rem;
                        background-color: #fff;
                        border: 1px solid rgba(26,26,26,0.2);
                        color: #1A1A1A;
                        font-family: 'Inter', sans-serif;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.75rem;
                        cursor: pointer;
                        transition: background-color 0.3s ease;
                        margin-bottom: 1.5rem;
                    }
                    .auth-provider-btn:hover {
                        background-color: #f9f9f9;
                    }
                    .auth-separator {
                        text-align: center;
                        margin-bottom: 1.5rem;
                        position: relative;
                    }
                    .auth-separator::before {
                        content: '';
                        position: absolute;
                        top: 50%; left: 0; right: 0;
                        height: 1px;
                        background-color: rgba(26,26,26,0.1);
                        z-index: 1;
                    }
                    .auth-separator span {
                        background-color: #FDFCF8;
                        padding: 0 1rem;
                        font-family: 'Inter', sans-serif;
                        font-size: 0.75rem;
                        color: #5A5A5A;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        position: relative;
                        z-index: 2;
                    }
                </style>
                
                <button class="auth-provider-btn" onclick="signInWithGoogle()" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                </button>
                <div class="auth-separator"><span>or</span></div>

                <div class="auth-tabs">
                    <button class="auth-tab active" onclick="switchAuthTab('signin')">Sign In</button>
                    <button class="auth-tab" onclick="switchAuthTab('signup')">Create Account</button>
                </div>

                <form id="auth-form" onsubmit="handleAuthSubmit(event)">
                    <div id="signup-fields" style="display: none;">
                        <div class="input-group">
                            <label for="auth-name">Full Name</label>
                            <input type="text" id="auth-name" placeholder="Jane Doe">
                        </div>
                        <div class="input-group">
                            <label for="auth-phone">Phone Number</label>
                            <input type="tel" id="auth-phone" placeholder="+254 700 000 000">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="auth-email">Email Address</label>
                        <input type="email" id="auth-email" required placeholder="you@example.com">
                    </div>
                    <p id="auth-error-msg" class="auth-error"></p>
                    <p id="auth-success-msg" style="color: var(--accent-gold); font-size: 0.85rem; margin-bottom: 1rem; text-align: center; display: none;"></p>
                    <button type="submit" class="auth-submit-btn" id="auth-submit-btn">Continue with Email</button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Trap clicks outside the modal content to close it
    document.getElementById('auth-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeLoginModal();
        }
    });

    // Fade in
    setTimeout(() => {
        document.getElementById('auth-modal').classList.add('visible');
    }, 10);
}

function closeLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.remove();
        }, 300); // Wait for transition
    }
}

let currentAuthMode = 'signin';

function switchAuthTab(mode) {
    currentAuthMode = mode;
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    
    if (mode === 'signin') {
        tabs[0].classList.add('active');
        document.getElementById('auth-submit-btn').innerText = 'Continue with Email';
        document.getElementById('signup-fields').style.display = 'none';
        if (nameInput) nameInput.removeAttribute('required');
        if (phoneInput) phoneInput.removeAttribute('required');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('auth-submit-btn').innerText = 'Send Sign Up Link';
        document.getElementById('signup-fields').style.display = 'block';
        if (nameInput) nameInput.setAttribute('required', 'true');
        if (phoneInput) phoneInput.setAttribute('required', 'true');
    }
    document.getElementById('auth-error-msg').innerText = '';
    const successMsg = document.getElementById('auth-success-msg');
    if (successMsg) successMsg.style.display = 'none';
}

async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href
            }
        });
        if (error) throw error;
    } catch (error) {
        document.getElementById('auth-error-msg').innerText = error.message || 'Google Sign-In failed.';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const name = document.getElementById('auth-name') ? document.getElementById('auth-name').value : '';
    const phone = document.getElementById('auth-phone') ? document.getElementById('auth-phone').value : '';
    const errorMsg = document.getElementById('auth-error-msg');
    const successMsg = document.getElementById('auth-success-msg');
    const submitBtn = document.getElementById('auth-submit-btn');

    errorMsg.innerText = '';
    if (successMsg) successMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerText = 'Sending Link...';

    try {
        const options = {
            emailRedirectTo: window.location.href
        };
        
        if (currentAuthMode === 'signup') {
            options.data = {
                full_name: name,
                phone: phone
            };
        }

        const { error } = await supabase.auth.signInWithOtp({ email, options });
        if (error) throw error;
        
        if (successMsg) {
            successMsg.innerText = 'A secure login link has been sent to your email.';
            successMsg.style.display = 'block';
        }
        submitBtn.innerText = 'Check Your Email';
    } catch (error) {
        errorMsg.innerText = error.message || 'Authentication failed.';
        submitBtn.disabled = false;
        submitBtn.innerText = currentAuthMode === 'signin' ? 'Continue with Email' : 'Send Sign Up Link';
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    // Redirect to home or reload
    if (window.location.pathname.includes('profile.html')) {
        window.location.href = 'index.html';
    } else {
        updateNavState();
    }
}

// Function to update the Nav bar based on auth state
async function updateNavState() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const navLinksContainer = document.querySelector('.nav-links-container') || document.querySelector('header');
    
    // We will find and remove existing auth links to rebuild them
    document.querySelectorAll('.auth-link').forEach(el => el.remove());

    const shopLink = document.getElementById('shop-nav-link');

    if (session) {
        // Logged In State
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link auth-link';
        profileLink.innerText = 'Profile';
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'nav-link auth-link';
        logoutLink.innerText = 'Logout';
        logoutLink.onclick = (e) => { e.preventDefault(); handleLogout(); };
        
        if (shopLink) {
            shopLink.before(profileLink);
            // insert some spacing logic if needed, but flex gap usually handles it
            shopLink.before(logoutLink);
        } else {
            navLinksContainer.appendChild(profileLink);
            navLinksContainer.appendChild(logoutLink);
        }
    } else {
        // Logged Out State
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'nav-link auth-link';
        loginLink.innerText = 'Login / Sign Up';
        loginLink.onclick = (e) => { e.preventDefault(); createLoginModal(); };
        
        if (shopLink) {
            shopLink.before(loginLink);
        } else {
            navLinksContainer.appendChild(loginLink);
        }
    }
}

// Intercept checkout buttons if not logged in
async function setupCheckoutGuards() {
    const checkoutLinks = document.querySelectorAll('a[href^="https://paystack.com"]');
    
    checkoutLinks.forEach(link => {
        // Save the original href so we can conditionally navigate
        const originalHref = link.getAttribute('href');
        link.dataset.checkoutHref = originalHref;
        link.removeAttribute('href'); // Remove so it doesn't navigate automatically
        link.style.cursor = 'pointer';
        
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Logged in, proceed to checkout
                window.open(originalHref, '_blank');
            } else {
                // Not logged in, open modal
                sessionStorage.setItem('pendingCheckoutUrl', originalHref);
                createLoginModal();
            }
        });
    });
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        await updateNavState();
        
        // Handle automatic checkout popup if returning from Google OAuth
        const pendingUrl = sessionStorage.getItem('pendingCheckoutUrl');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (pendingUrl && session) {
            sessionStorage.removeItem('pendingCheckoutUrl');
            window.open(pendingUrl, '_blank');
        }
    })();
    setupCheckoutGuards();
});

    // Expose functions to the global window object so HTML onClick handlers still work
    window.createLoginModal = createLoginModal;
    window.closeLoginModal = closeLoginModal;
    window.switchAuthTab = switchAuthTab;
    window.signInWithGoogle = signInWithGoogle;
    window.handleAuthSubmit = handleAuthSubmit;
    window.handleLogout = handleLogout;
}
