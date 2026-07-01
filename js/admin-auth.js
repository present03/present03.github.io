/* ==========================================
   관리자 임시 로그인
   - 서버/DB 연결 전 테스트용
   - 실제 운영 시 Supabase Auth로 교체
   ========================================== */

window.AdminAuth = {
    loginKey: 'wolchon_admin_logged_in',

    // 임시 관리자 계정
    adminId: 'admin',
    adminPassword: '1234',

    init: function () {
        const pageName = location.pathname.split('/').pop();
        const isAdminPage = pageName.startsWith('admin_');
        const isLoginPage = pageName === 'admin_login.html';

        if (isLoginPage) {
            this.handleLoginPage();
            return;
        }

        if (isAdminPage) {
            this.checkLogin();
        }
    },

    handleLoginPage: function () {
        const form = document.getElementById('admin-login-form');

        if (sessionStorage.getItem(this.loginKey) === 'true') {
            location.href = 'admin_dashboard.html';
            return;
        }

        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const id = document.getElementById('admin-id').value.trim();
            const password = document.getElementById('admin-password').value.trim();

            if (id === this.adminId && password === this.adminPassword) {
                sessionStorage.setItem(this.loginKey, 'true');
                location.href = 'admin_dashboard.html';
            } else {
                alert('아이디 또는 비밀번호가 올바르지 않습니다.');
            }
        });
    },

    checkLogin: function () {
        const isLoggedIn = sessionStorage.getItem(this.loginKey) === 'true';

        if (!isLoggedIn) {
            alert('관리자 로그인 후 이용해 주세요.');
            location.href = 'admin_login.html';
        }
    },

    logout: function () {
        sessionStorage.removeItem(this.loginKey);
        alert('로그아웃되었습니다.');
        location.href = 'admin_login.html';
    }
};

document.addEventListener('DOMContentLoaded', function () {
    window.AdminAuth.init();
});