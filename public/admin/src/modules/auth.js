// src/modules/auth.js
import { supabase } from '../services/supabaseClient.js';

const authContainer = document.getElementById('auth-container');
let isLogin = false; // Default to signup

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: isAllowed, error } = await supabase.rpc('is_role_or_higher', { p_min_role: 'base_admin' });
        
        if (isAllowed) {
            window.location.replace('/dashboard.html');
        } else {
            window.location.replace('/credit-check.html');
        }
    } else {
        render();
    }
}

function render() {
    if (!authContainer) return;

    const mainHeading = isLogin ? 'Welcome Back' : 'Create Your Account'; 

    const clipPathSVG = `
        <svg width="0" height="0" style="position: absolute;">
            <defs>
                <clipPath id="rect-clip" clipPathUnits="objectBoundingBox">
                    <path d="M0,0 H1 V1 H0 Z" />
                </clipPath>
            </defs>
        </svg>
    `;

    // bg-black confirmed
    authContainer.innerHTML = `
    ${clipPathSVG}
    <div class="w-full max-w-6xl mx-auto grid lg:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden bg-black min-h-[700px]">
        
        <div class="relative flex flex-col items-center justify-center p-8 lg:p-12 text-white" 
             style="background-image: url('https://static.wixstatic.com/media/f82622_53f91a7cf57744c7aee58e297e476e1b~mv2.png'); 
                    background-size: cover; 
                    background-position: center bottom; 
                    clip-path: url(#rect-clip);">
            
            <div class="relative z-10 text-center p-4 max-w-sm mx-auto" style="transform: translateY(123px);">
                <h2 class="text-base font-bold mb-2">Zwane Finance</h2>
                <h3 class="text-2xl font-normal mb-4">Get Started</h3>
                
                <p class="text-xs sm:text-sm text-gray-200">
                    A Leap to Financial Freedom
                </p>
                
                <div class="mt-8 space-y-2 max-w-xs mx-auto">
                    
                    <div class="flex items-center p-2">
                        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white text-gray-900 font-bold text-xs mr-3">1</span>
                        <span class="text-white font-medium text-sm p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors duration-200 cursor-pointer">Sign up your account</span>
                    </div>
                    <div class="flex items-center p-2">
                        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white bg-opacity-30 text-white font-bold text-xs mr-3">2</span>
                        <span class="text-gray-300 font-medium text-sm p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors duration-200 cursor-pointer">Verify your identity</span>
                    </div>
                    <div class="flex items-center p-2">
                        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white bg-opacity-30 text-white font-bold text-xs mr-3">3</span>
                        <span class="text-gray-300 font-medium text-sm p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors duration-200 cursor-pointer">Access your funds</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-12 lg:p-16 text-gray-300 flex flex-col justify-center bg-black">
            <div>
                <h2 class="text-3xl font-extrabold text-white">${mainHeading}</h2>
                <p class="mt-2 text-gray-400">${isLogin ? 'Sign in to your account' : 'Enter your personal data to create your account.'}</p>
            </div>
            
            <form id="auth-form" class="mt-8 space-y-6">
                <div class="space-y-4">
                    
                    ${!isLogin ? `
                    <div>
                        <label for="full-name" class="text-sm font-medium text-gray-400">Full Name</label>
                        <input id="full-name" name="fullName" type="text" required class="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-800 placeholder-gray-500 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500" placeholder="eg. John Francisco">
                    </div>
                    ` : ''}

                    <div>
                        <label for="email-address" class="text-sm font-medium text-gray-400">Email address</label>
                        <input id="email-address" name="email" type="email" autocomplete="email" required class="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-800 placeholder-gray-500 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500" placeholder="eg. johnfrancisco@gmail.com">
                    </div>

                    <div>
                        <label for="password" class="text-sm font-medium text-gray-400">Password</label>
                        <input id="password" name="password" type="password" autocomplete="current-password" required class="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-800 placeholder-gray-500 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500" placeholder="Enter your password">
                        ${!isLogin ? `<p class="mt-2 text-xs text-gray-500">Must be at least 6 characters.</p>` : ''}
                    </div>
                </div>

                <div id="auth-error" class="text-sm text-center font-medium text-red-500"></div>
                
                <div>
                    <button type="submit" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-gray-900 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white disabled:opacity-50">
                        <span id="auth-button-content">
                            ${isLogin ? 'Sign In' : 'Sign Up'}
                        </span>
                    </button>
                </div>
            </form>

            <div class="text-center pt-6">
                <button id="toggle-auth" class="text-sm font-medium text-orange-500 hover:text-orange-400">
                    ${isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
                </button>
            </div>
        </div>
    </div>`;

    attachFormListener();
}

function attachFormListener() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
    const toggleButton = document.getElementById('toggle-auth');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            isLogin = !isLogin;
            render();
        });
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const errorDiv = document.getElementById('auth-error');
    const buttonContent = document.getElementById('auth-button-content');
    e.target.querySelector('button').disabled = true;
    buttonContent.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...`;
    errorDiv.textContent = '';

    if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            errorDiv.textContent = error.message;
        } else {
            window.location.replace('/index.html');
        }
    } else {
        // --- SIGN UP ---
        const fullName = e.target.fullName.value;
        
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName 
                }
            }
        });

        if (error) {
            errorDiv.textContent = error.message;
        } else if (data.user) {
            alert('Account created! Please check your email to verify your account.');
            isLogin = true;
            render();
        }
    }
    
    // Reset button state (only if it hasn't navigated away)
    const formButton = e.target.querySelector('button');
    if (formButton) {
        formButton.disabled = false;
        if (buttonContent) {
            buttonContent.innerHTML = `${isLogin ? 'Sign In' : 'Sign Up'}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
