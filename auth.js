// js/auth.js
// دوال التسجيل وتسجيل الدخول

// دالة التسجيل
async function register(name, email, password, role) {
    try {
        // 1. تسجيل المستخدم في Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: role
                }
            }
        })

        if (authError) throw authError

        // 2. إضافة المستخدم في جدول users
        if (authData.user) {
            const { error: dbError } = await supabaseClient
                .from('users')
                .insert([
                    { 
                        id: authData.user.id, 
                        name: name, 
                        email: email, 
                        role: role 
                    }
                ])

            if (dbError) throw dbError
        }

        alert('✅ تم التسجيل بنجاح! يرجى تسجيل الدخول')
        window.location.href = 'login.html'
        
    } catch (error) {
        console.error('Registration error:', error)
        alert('❌ خطأ في التسجيل: ' + error.message)
    }
}

// دالة تسجيل الدخول
async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        })

        if (error) throw error

        if (data.user) {
            // جلب نوع المستخدم
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('role, name')
                .eq('id', data.user.id)
                .single()

            if (userError) throw userError

            // تخزين معلومات المستخدم في sessionStorage
            sessionStorage.setItem('userId', data.user.id)
            sessionStorage.setItem('userRole', userData.role)
            sessionStorage.setItem('userName', userData.name)

            // التوجيه حسب نوع المستخدم
            window.location.href = `dashboard.html?type=${userData.role}`
        }
        
    } catch (error) {
        console.error('Login error:', error)
        alert('❌ خطأ في تسجيل الدخول: ' + error.message)
    }
}

// التحقق من الجلسة الحالية
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    return session
}