// js/dashboard.js
// دوال لوحة التحكم حسب نوع المستخدم

// متغيرات عامة
let currentUser = null
let userRole = null
let userId = null

// تهيئة الصفحة
async function initDashboard() {
    // التحقق من تسجيل الدخول
    const session = await checkSession()
    if (!session) {
        window.location.href = 'login.html'
        return
    }

    // جلب معلومات المستخدم
    userId = sessionStorage.getItem('userId')
    userRole = sessionStorage.getItem('userRole')
    const userName = sessionStorage.getItem('userName')

    // عرض اسم المستخدم
    document.getElementById('userName').textContent = userName
    document.getElementById('userRole').textContent = getUserRoleArabic(userRole)

    // عرض المحتوى حسب نوع المستخدم
    if (userRole === 'restaurant') {
        showRestaurantDashboard()
    } else if (userRole === 'charity' || userRole === 'volunteer') {
        showCharityDashboard()
    }
}

// تحويل نوع المستخدم للعربية
function getUserRoleArabic(role) {
    const roles = {
        'restaurant': 'مطعم',
        'charity': 'جمعية',
        'volunteer': 'متطوع'
    }
    return roles[role] || role
}

// ========== دوال المطعم ==========
async function showRestaurantDashboard() {
    document.getElementById('dashboardTitle').textContent = 'لوحة تحكم المطعم'
    
    // عرض الأقسام الخاصة بالمطعم
    document.getElementById('restaurantSections').style.display = 'block'
    
    // تحميل الفوائض الخاصة بالمطعم
    await loadRestaurantListings()
    
    // تحميل الطلبات الواردة
    await loadIncomingRequests()
}

// إضافة فائض جديد
async function addFoodListing(event) {
    event.preventDefault()
    
    const title = document.getElementById('foodTitle').value
    const quantity = document.getElementById('quantity').value
    const pickupTime = document.getElementById('pickupTime').value

    try {
        const { error } = await supabaseClient
            .from('food_listings')
            .insert([
                {
                    restaurant_id: userId,
                    food_title: title,
                    quantity: quantity,
                    pickup_time: pickupTime,
                    status: 'available'
                }
            ])

        if (error) throw error

        alert('✅ تم إضافة الفائض بنجاح')
        closeModal()
        await loadRestaurantListings()
        
    } catch (error) {
        console.error('Error adding listing:', error)
        alert('❌ حدث خطأ: ' + error.message)
    }
}

// تحميل قائمة الفوائض للمطعم
async function loadRestaurantListings() {
    try {
        const { data, error } = await supabaseClient
            .from('food_listings')
            .select('*')
            .eq('restaurant_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        displayRestaurantListings(data)
        
    } catch (error) {
        console.error('Error loading listings:', error)
    }
}

// عرض الفوائض في الصفحة
function displayRestaurantListings(listings) {
    const container = document.getElementById('restaurantListings')
    if (!container) return

    if (listings.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد فوائض مضافة بعد</p>'
        return
    }

    let html = ''
    listings.forEach(listing => {
        html += `
            <div class="food-card">
                <h4>${listing.food_title}</h4>
                <p class="food-detail"><strong>الكمية:</strong> ${listing.quantity}</p>
                <p class="food-detail"><strong>موعد الاستلام:</strong> ${listing.pickup_time}</p>
                <span class="food-status status-${listing.status}">${getStatusArabic(listing.status)}</span>
            </div>
        `
    })
    
    container.innerHTML = html
}

// تحميل الطلبات الواردة
async function loadIncomingRequests() {
    try {
        // أولاً نجلب الفوائض الخاصة بالمطعم
        const { data: listings, error: listingsError } = await supabaseClient
            .from('food_listings')
            .select('id, food_title')
            .eq('restaurant_id', userId)

        if (listingsError) throw listingsError

        if (listings.length === 0) return

        // نجلب الطلبات المرتبطة بهذه الفوائض
        const listingIds = listings.map(l => l.id)
        const { data: requests, error: requestsError } = await supabaseClient
            .from('requests')
            .select(`
                *,
                food_listings!inner(food_title),
                requester:users(name)
            `)
            .in('listing_id', listingIds)
            .order('created_at', { ascending: false })

        if (requestsError) throw requestsError

        displayIncomingRequests(requests)
        
    } catch (error) {
        console.error('Error loading requests:', error)
    }
}

// عرض الطلبات الواردة
function displayIncomingRequests(requests) {
    const container = document.getElementById('incomingRequests')
    if (!container) return

    if (requests.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد طلبات واردة</p>'
        return
    }

    let html = ''
    requests.forEach(request => {
        html += `
            <div class="request-card">
                <p><strong>الوجبة:</strong> ${request.food_listings.food_title}</p>
                <p><strong>طالب:</strong> ${request.requester.name}</p>
                <p><strong>الحالة:</strong> ${getRequestStatusArabic(request.status)}</p>
                ${request.status === 'pending' ? `
                    <div class="request-actions">
                        <button onclick="handleRequest('${request.id}', 'approved')" class="btn-small btn-approve">موافقة</button>
                        <button onclick="handleRequest('${request.id}', 'rejected')" class="btn-small btn-reject">رفض</button>
                    </div>
                ` : ''}
            </div>
        `
    })
    
    container.innerHTML = html
}

// معالجة الطلب (موافقة/رفض)
async function handleRequest(requestId, status) {
    try {
        const { error } = await supabaseClient
            .from('requests')
            .update({ status: status })
            .eq('id', requestId)

        if (error) throw error

        // إذا تمت الموافقة، نحدث حالة الفائض إلى reserved
        if (status === 'approved') {
            const { data: request } = await supabaseClient
                .from('requests')
                .select('listing_id')
                .eq('id', requestId)
                .single()

            await supabaseClient
                .from('food_listings')
                .update({ status: 'reserved' })
                .eq('id', request.listing_id)
        }

        alert('✅ تم تحديث الطلب')
        await loadIncomingRequests()
        
    } catch (error) {
        console.error('Error handling request:', error)
        alert('❌ حدث خطأ: ' + error.message)
    }
}

// ========== دوال الجمعية والمتطوع ==========
async function showCharityDashboard() {
    document.getElementById('dashboardTitle').textContent = 'لوحة تحكم الجمعية'
    
    // عرض الأقسام الخاصة بالجمعية
    document.getElementById('charitySections').style.display = 'block'
    
    // تحميل الفوائض المتاحة
    await loadAvailableListings()
    
    // تحميل طلباتي
    await loadMyRequests()
}

// تحميل الفوائض المتاحة
async function loadAvailableListings() {
    try {
        const { data, error } = await supabaseClient
            .from('food_listings')
            .select(`
                *,
                restaurant:users(name)
            `)
            .eq('status', 'available')
            .order('created_at', { ascending: false })

        if (error) throw error

        displayAvailableListings(data)
        
    } catch (error) {
        console.error('Error loading available listings:', error)
    }
}

// عرض الفوائض المتاحة
function displayAvailableListings(listings) {
    const container = document.getElementById('availableListings')
    if (!container) return

    if (listings.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد فوائض متاحة حالياً</p>'
        return
    }

    let html = ''
    listings.forEach(listing => {
        html += `
            <div class="food-card">
                <h4>${listing.food_title}</h4>
                <p class="food-detail"><strong>المطعم:</strong> ${listing.restaurant.name}</p>
                <p class="food-detail"><strong>الكمية:</strong> ${listing.quantity}</p>
                <p class="food-detail"><strong>موعد الاستلام:</strong> ${listing.pickup_time}</p>
                <button onclick="requestListing('${listing.id}')" class="btn-small btn-request">طلب استلام</button>
            </div>
        `
    })
    
    container.innerHTML = html
}

// طلب استلام فائض
async function requestListing(listingId) {
    try {
        const { error } = await supabaseClient
            .from('requests')
            .insert([
                {
                    listing_id: listingId,
                    requester_id: userId,
                    status: 'pending'
                }
            ])

        if (error) throw error

        alert('✅ تم إرسال الطلب بنجاح')
        await loadAvailableListings()
        await loadMyRequests()
        
    } catch (error) {
        console.error('Error requesting listing:', error)
        alert('❌ حدث خطأ: ' + error.message)
    }
}

// تحميل طلباتي
async function loadMyRequests() {
    try {
        const { data, error } = await supabaseClient
            .from('requests')
            .select(`
                *,
                food_listings!inner(
                    food_title,
                    quantity,
                    pickup_time,
                    restaurant:users(name)
                )
            `)
            .eq('requester_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        displayMyRequests(data)
        
    } catch (error) {
        console.error('Error loading my requests:', error)
    }
}

// عرض طلباتي
function displayMyRequests(requests) {
    const container = document.getElementById('myRequests')
    if (!container) return

    if (requests.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد طلبات سابقة</p>'
        return
    }

    let html = ''
    requests.forEach(request => {
        html += `
            <div class="food-card">
                <h4>${request.food_listings.food_title}</h4>
                <p class="food-detail"><strong>المطعم:</strong> ${request.food_listings.restaurant.name}</p>
                <p class="food-detail"><strong>الكمية:</strong> ${request.food_listings.quantity}</p>
                <p class="food-detail"><strong>موعد الاستلام:</strong> ${request.food_listings.pickup_time}</p>
                <span class="food-status status-${request.status}">${getRequestStatusArabic(request.status)}</span>
            </div>
        `
    })
    
    container.innerHTML = html
}

// دوال مساعدة
function getStatusArabic(status) {
    const statusMap = {
        'available': 'متاح',
        'reserved': 'محجوز',
        'collected': 'تم الاستلام'
    }
    return statusMap[status] || status
}

function getRequestStatusArabic(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'approved': 'تمت الموافقة',
        'rejected': 'مرفوض'
    }
    return statusMap[status] || status
}

// فتح وإغلاق النوافذ المنبثقة
function openAddFoodModal() {
    document.getElementById('addFoodModal').classList.add('active')
}

function closeModal() {
    document.getElementById('addFoodModal').classList.remove('active')
}

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', initDashboard)