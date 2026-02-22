// ==========================================
// 1. CONFIGURATION & GLOBAL STATE
// ==========================================

// ⚠️ IMPORTANT: Yahan apna naya Google Apps Script ka Web App URL daalein
const API_URL = "https://script.google.com/macros/s/AKfycbxOCHte0q1KVWczDMC1lEeCCAPnF2QMLRZgEoCkx2Poq3TFKbweYJmZ4qyv3bUBRbqe/exec"; 

let allProducts = [];
let currentUser = JSON.parse(localStorage.getItem('user_tflodia'));

// ==========================================
// 2. INITIALIZATION (On Page Load)
// ==========================================

window.onload = () => {
    checkAuth();
    loadProductsFromCacheAndFetch(); // SWR: Pehle cache se load karega, phir background me fetch karega (Fast Loading)
    
    // Live Search Event Listener
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });

    // Copyright Checkbox Logic (Buy Modal)
    document.getElementById('copyrightCheck').addEventListener('change', function() {
        const btn = document.getElementById('btnConfirmOrder');
        const paySec = document.getElementById('paymentSection');
        
        if(this.checked) {
            btn.disabled = false;
            btn.innerHTML = "Verify & Pay <i class='fa-solid fa-arrow-right ml-2'></i>";
            btn.classList.remove('bg-gray-300', 'cursor-not-allowed');
            btn.classList.add('bg-green-600', 'hover:bg-green-700', 'shadow-lg', 'shadow-green-200');
            paySec.classList.remove('hidden');
        } else {
            btn.disabled = true;
            btn.innerHTML = "<i class='fa-solid fa-lock'></i> Accept Declaration First";
            btn.classList.add('bg-gray-300', 'cursor-not-allowed');
            btn.classList.remove('bg-green-600', 'hover:bg-green-700', 'shadow-lg', 'shadow-green-200');
            paySec.classList.add('hidden');
        }
    });
};

// ==========================================
// 3. FAST LOADING SYSTEM (Cache-First SWR)
// ==========================================

function loadProductsFromCacheAndFetch() {
    // A. Turant Local Storage (Cache) se data dikhao
    const cachedData = localStorage.getItem('tflodia_products_cache');
    if (cachedData) {
        allProducts = JSON.parse(cachedData);
        renderProducts(allProducts);
        document.getElementById('totalCount').innerText = `${allProducts.length} Items`;
    }

    // B. Background mein Google Sheet se naya data laao
    fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'getProducts' }) 
    })
    .then(res => res.json())
    .then(result => {
        if(result.success) {
            const freshData = result.data.reverse(); // Newest first
            
            // C. Agar naya data cache se alag hai, tabhi UI update karo (No flicker)
            if(JSON.stringify(freshData) !== JSON.stringify(allProducts)) {
                allProducts = freshData;
                localStorage.setItem('tflodia_products_cache', JSON.stringify(allProducts));
                renderProducts(allProducts);
                document.getElementById('totalCount').innerText = `${allProducts.length} Items`;
            }
        }
    })
    .catch(err => console.log("Silent background fetch failed", err));
}

// ==========================================
// 4. RENDERING PRODUCTS & FILTERS
// ==========================================

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = ""; // Clear Skeletons

    if(list.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-medium"><i class="fa-solid fa-box-open text-4xl mb-3 block"></i>No products found</div>`;
        return;
    }

    list.forEach(p => {
        // Data Format: [0:ID, 1:Title, 2:Price, 3:Desc, 4:Img, 5:Demo, 6:Link, 7:Type, 8:Cat, 9:Tags, 10:IsNew]
        let isFree = (p[2] == 0 || p[2] == "0");
        let isNew = String(p[10]).toLowerCase() === 'true';
        
        // Badges
        let newBadge = isNew ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-2 py-1 rounded-md shadow font-bold uppercase z-10">NEW</span>` : '';
        let typeBadge = p[7] === 'Combo' 
            ? `<span class="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Combo</span>` 
            : `<span class="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Unit</span>`;

        // Buttons
        let primaryBtn = isFree 
            ? `<a href="${p[6]}" target="_blank" class="flex-1 text-center bg-green-500 text-white py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition block">Download Free</a>`
            : `<button onclick="openBuyModal('${p[0]}', '${p[1].replace(/'/g, "\\'")}', '${p[2]}', '${p[4]}', '${p[7]}')" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition">Buy ₹${p[2]}</button>`;

        let demoBtn = p[5] ? `<a href="${p[5]}" target="_blank" class="flex-1 text-center bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold active:scale-95 transition">Demo</a>` : '';

        let card = `
            <div class="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col h-full relative group">
                ${newBadge}
                <div class="relative mb-3 overflow-hidden rounded-xl">
                    <img src="${p[4]}" class="w-full h-32 object-cover bg-gray-50 group-hover:scale-105 transition-transform duration-300" loading="lazy">
                    <div class="absolute top-2 right-2 flex gap-1 z-10">${typeBadge}</div>
                </div>
                <div class="flex-grow flex flex-col">
                    <h3 class="text-sm font-bold text-gray-900 leading-tight mb-1 line-clamp-2">${p[1]}</h3>
                    <p class="text-[10px] text-gray-400 font-medium uppercase tracking-wider line-clamp-1 mb-2">${p[8] || 'Premium'}</p>
                </div>
                <div class="flex gap-2 mt-auto pt-2 border-t border-gray-50">
                    ${demoBtn}
                    ${primaryBtn}
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });
}

function filterProducts(query) {
    query = query.toLowerCase();
    const filtered = allProducts.filter(p => `${p[1]} ${p[8]} ${p[9]} ${p[7]}`.toLowerCase().includes(query));
    renderProducts(filtered);
}

function filterByCategory(cat) {
    document.querySelectorAll('.chip, .chip-free').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if(cat === 'all') renderProducts(allProducts);
    else if(cat === 'Free') renderProducts(allProducts.filter(p => p[2] == 0));
    else renderProducts(allProducts.filter(p => p[7] === cat || p[8] === cat));
}

// ==========================================
// 5. OTP & AUTHENTICATION SYSTEM
// ==========================================

// Step 1: Send OTP for Register or Forgot Password
async function sendOtp(type) {
    const emailInput = type === 'register' ? 'rEmail' : 'fEmail';
    const btnInput = type === 'register' ? 'btnSendOtp' : 'btnForgotOtp';
    
    const email = document.getElementById(emailInput).value.trim();
    if(!email) return showToast("Please enter your email address!");

    const btn = document.getElementById(btnInput);
    const originalText = btn.innerText;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`; 
    btn.disabled = true;

    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'sendOtp', email: email, type: type }) 
        });
        let data = await res.json();
        
        if(data.success) {
            showToast("OTP sent to your email!");
            if(type === 'register') {
                document.getElementById('regStep1').classList.add('hidden');
                document.getElementById('regStep2').classList.remove('hidden');
            } else {
                document.getElementById('forgotStep1').classList.add('hidden');
                document.getElementById('forgotStep2').classList.remove('hidden');
            }
        } else {
            showToast(data.message);
        }
    } catch(e) { 
        showToast("Network Error! Could not send OTP."); 
    }
    
    btn.innerHTML = originalText; 
    btn.disabled = false;
}

// Step 2A: Verify OTP & Register
async function verifyAndRegister() {
    const data = {
        action: 'verifyAndRegister',
        name: document.getElementById('rName').value.trim(),
        email: document.getElementById('rEmail').value.trim(),
        password: document.getElementById('rPass').value.trim(),
        phone: document.getElementById('rPhone').value.trim(),
        otp: document.getElementById('rOtp').value.trim()
    };
    
    if(!data.otp) return showToast("Enter the 6-digit OTP");

    const btn = document.getElementById('btnVerifyReg'); 
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`; 
    btn.disabled = true;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        let result = await res.json();
        
        if(result.success) { 
            showToast("Account Created Successfully!"); 
            // Auto Login optional, but switching to login is safer
            switchAuth('login'); 
            document.getElementById('loginEmail').value = data.email;
            
            // Reset Registration form
            document.getElementById('regStep2').classList.add('hidden');
            document.getElementById('regStep1').classList.remove('hidden');
            document.getElementById('rOtp').value = "";
        } else {
            showToast(result.message);
        }
    } catch(e) { showToast("Verification Failed."); }
    
    btn.innerHTML = "Confirm & Create Account"; 
    btn.disabled = false;
}

// Step 2B: Verify OTP & Reset Password
async function resetPassword() {
    const data = {
        action: 'resetPassword',
        email: document.getElementById('fEmail').value.trim(),
        otp: document.getElementById('fOtp').value.trim(),
        newPassword: document.getElementById('fNewPass').value.trim()
    };
    
    if(!data.otp || !data.newPassword) return showToast("Enter OTP and New Password");

    const btn = document.getElementById('btnReset'); 
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating...`; 
    btn.disabled = true;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        let result = await res.json();
        
        if(result.success) { 
            showToast("Password updated successfully!"); 
            switchAuth('login');
            
            // Reset Forgot form
            document.getElementById('forgotStep2').classList.add('hidden');
            document.getElementById('forgotStep1').classList.remove('hidden');
        } else {
            showToast(result.message);
        }
    } catch(e) { showToast("Failed to reset password."); }
    
    btn.innerHTML = "Update Password"; 
    btn.disabled = false;
}

// Normal Login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    if(!email || !pass) return showToast("Fill all fields");

    const btn = document.getElementById('btnLogin'); 
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`; 
    btn.disabled = true;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', email, password: pass }) });
        let result = await res.json();
        
        if(result.success) {
            currentUser = result; 
            localStorage.setItem('user_tflodia', JSON.stringify(result));
            closeModal('loginModal'); 
            checkAuth(); 
            showToast(`Welcome back, ${result.name.split(' ')[0]}!`);
            document.getElementById('loginPass').value = ""; // Clear pass
        } else {
            showToast(result.message);
        }
    } catch(e) { showToast("Login Error. Check connection."); }
    
    btn.innerHTML = "Secure Login"; 
    btn.disabled = false;
}

function checkAuth() {
    if(currentUser) {
        document.getElementById('authStatus').innerHTML = `<div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm cursor-pointer border border-blue-200" onclick="router('profile')">${currentUser.name.charAt(0).toUpperCase()}</div>`;
        document.getElementById('profileName').innerText = currentUser.name;
        document.getElementById('profileEmail').innerText = currentUser.email;
        document.getElementById('logoutBtn').classList.remove('hidden');
    } else {
        document.getElementById('authStatus').innerHTML = `<button onclick="openModal('loginModal')" class="bg-blue-600 text-white px-5 py-1.5 rounded-full text-xs font-bold active:scale-95 transition">Login</button>`;
        document.getElementById('profileName').innerText = "Guest User";
        document.getElementById('profileEmail').innerText = "Not logged in";
        document.getElementById('logoutBtn').classList.add('hidden');
    }
}

function logout() { 
    localStorage.removeItem('user_tflodia'); 
    currentUser = null; 
    checkAuth(); 
    router('home'); 
    showToast("Logged out successfully"); 
}


// ==========================================
// 6. ORDERING & PAYMENTS
// ==========================================

function openBuyModal(id, title, price, img, type) {
    if(!currentUser) { showToast("Please login to buy content"); openModal('loginModal'); return; }
    
    document.getElementById('buyProdId').value = id; 
    document.getElementById('buyTitle').innerText = title; 
    document.getElementById('buyPrice').innerText = price; 
    document.getElementById('buyImg').src = img;
    
    // Auto Generate Exact Amount QR Code for UPI
    document.getElementById('payQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=tflodia@ybl&pn=TFLODIA&am=${price}&cu=INR`;
    
    // Reset Modal Security Settings
    document.getElementById('copyrightCheck').checked = false; 
    document.getElementById('paymentSection').classList.add('hidden'); 
    document.getElementById('btnConfirmOrder').disabled = true; 
    document.getElementById('trxId').value = "";
    
    openModal('buyModal');
}

async function confirmOrder() {
    const trx = document.getElementById('trxId').value.trim();
    if(trx.length < 6) return showToast("Enter a valid 12-digit UTR/Trx ID");
    
    const btn = document.getElementById('btnConfirmOrder'); 
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`; 
    btn.disabled = true;
    
    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'placeOrder', userId: currentUser.userId, userEmail: currentUser.email, productId: document.getElementById('buyProdId').value, trxId: trx }) 
        });
        let result = await res.json();
        
        if(result.success) { 
            showToast("Order Placed! Please wait for Admin Verification."); 
            closeModal('buyModal'); 
            
            // Automatically take user to library to see pending status
            setTimeout(() => router('orders'), 1000); 
        }
    } catch(e) { showToast("Error processing order"); }
    
    btn.innerHTML = "Verify & Pay <i class='fa-solid fa-arrow-right ml-2'></i>"; 
    btn.disabled = false;
}

// ==========================================
// 7. USER LIBRARY (FETCH ORDERS)
// ==========================================

async function fetchOrders() {
    const list = document.getElementById('ordersList');
    
    if(!currentUser) {
        list.innerHTML = `
            <div class="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
                <i class="fa-solid fa-lock text-5xl text-gray-200 mb-4 block"></i>
                <p class="text-gray-500 font-bold text-sm">Login to view your library</p>
                <button onclick="openModal('loginModal')" class="mt-4 text-white font-bold text-xs bg-blue-600 px-6 py-2.5 rounded-full active:scale-95 transition">Login Now</button>
            </div>`;
        return;
    }

    // Show Skeleton Loader
    list.innerHTML = `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-pulse flex justify-between items-center mt-2">
            <div class="w-2/3"><div class="h-4 bg-gray-200 rounded w-full mb-2"></div><div class="h-3 bg-gray-200 rounded w-1/2"></div></div>
            <div class="h-8 w-20 bg-gray-200 rounded-lg"></div>
        </div>
    `;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getUserOrders', userId: currentUser.userId }) });
        let result = await res.json();
        list.innerHTML = "";
        
        if(result.data.length === 0) {
            list.innerHTML = `<div class="text-center py-12 bg-white rounded-2xl border border-gray-100 mt-4"><i class="fa-solid fa-folder-open text-5xl text-gray-200 mb-3 block"></i><p class="text-gray-400 font-bold text-sm">Library is empty</p><button onclick="router('home')" class="mt-4 text-blue-600 font-bold text-xs bg-blue-50 px-6 py-2.5 rounded-full">Explore Store</button></div>`;
            return;
        }

        result.data.reverse().forEach(o => {
            // Find product details from cache to display title/image
            let pInfo = allProducts.find(p => p[0] == o[2]);
            let displayTitle = pInfo ? pInfo[1] : `Product ID: ${o[2]}`;
            let displayImg = pInfo ? pInfo[4] : 'https://via.placeholder.com/150';
            
            let isApproved = o[4] === 'Approved';
            let statusStyle = isApproved ? 'text-green-700 bg-green-100' : 'text-orange-600 bg-orange-100';
            let btn = isApproved 
                ? `<a href="${pInfo ? pInfo[6] : '#'}" target="_blank" class="w-full block text-center bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold py-2.5 mt-3 rounded-xl active:scale-95 transition">Download PDF <i class="fa-solid fa-download ml-1"></i></a>` 
                : `<div class="w-full text-center bg-gray-50 text-gray-400 text-[11px] font-bold py-2.5 mt-3 rounded-xl border border-gray-100"><i class="fa-solid fa-clock mr-1"></i> Verification Pending</div>`;
            
            list.innerHTML += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mt-3 relative overflow-hidden">
                    <div class="flex gap-3 items-start">
                        <img src="${displayImg}" class="w-14 h-14 rounded-xl object-cover bg-gray-50 border border-gray-100">
                        <div class="flex-1">
                            <h4 class="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">${displayTitle}</h4>
                            <div class="flex items-center gap-2 mt-1.5">
                                <p class="text-[9px] text-gray-400 font-mono">#${o[0]}</p>
                                <span class="text-[9px] font-bold uppercase tracking-wider ${statusStyle} px-1.5 py-0.5 rounded">${o[4]}</span>
                            </div>
                        </div>
                    </div>
                    ${btn}
                </div>`;
        });
    } catch(e) { 
        list.innerHTML = `<p class="text-center text-xs text-red-500 font-bold mt-4 border border-red-200 bg-red-50 p-3 rounded-xl">Failed to load library</p>`; 
    }
}


// ==========================================
// 8. GLOBAL UTILITY FUNCTIONS
// ==========================================

function router(page) {
    // Hide all main views
    ['home', 'orders', 'support', 'profile'].forEach(p => document.getElementById(`view-${p}`).classList.add('hidden'));
    
    // Show target view
    document.getElementById(`view-${page}`).classList.remove('hidden');
    
    // Update active state in Bottom Navigation
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${page}`).classList.add('active');
    
    // Scroll to top
    document.getElementById('mainScroll').scrollTo({ top: 0, behavior: 'smooth' });
    
    // Fetch data if needed
    if(page === 'orders') fetchOrders();
}

// Modal Handlers
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Switch between Auth Modals
function switchAuth(to) { 
    closeModal('loginModal'); 
    closeModal('registerModal'); 
    closeModal('forgotModal'); 
    openModal(`${to}Modal`); 
}

// Toast Notifications
function showToast(msg) { 
    const t = document.getElementById('toast'); 
    document.getElementById('toastMsg').innerText = msg; 
    
    // Animate In
    t.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none'); 
    
    // Animate Out after 3s
    setTimeout(() => {
        t.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    }, 3000); 
}