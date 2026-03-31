/* ==========================================
   월촌캠핑장 - 공통 JS
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ===== 모바일 메뉴 =====
    const btnMenu = document.getElementById('btn-menu');
    const mainNav = document.getElementById('main-nav');
    const btnClose = document.getElementById('btn-menu-close');

    if (btnMenu) {
        btnMenu.addEventListener('click', function () {
            mainNav.classList.toggle('open');
        });
    }
    if (btnClose) {
        btnClose.addEventListener('click', function () {
            mainNav.classList.remove('open');
        });
    }

    // ===== 현재 페이지 메뉴 활성화 =====
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('#main-nav > ul > li > a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });

    // ===== 메인 슬라이더 =====
    const slider = document.querySelector('.main-slider');
    if (slider) {
        const slides = slider.querySelectorAll('.slide');
        const dots = slider.querySelectorAll('.dot');
        let current = 0;
        let timer;

        function goTo(n) {
            slides[current].classList.remove('active');
            if (dots[current]) dots[current].classList.remove('active');
            current = (n + slides.length) % slides.length;
            slides[current].classList.add('active');
            if (dots[current]) dots[current].classList.add('active');
        }

        function next() { goTo(current + 1); }

        function startAuto() { timer = setInterval(next, 4000); }
        function stopAuto() { clearInterval(timer); }

        // 버튼
        const btnPrev = slider.querySelector('.slider-prev');
        const btnNext = slider.querySelector('.slider-next');
        if (btnPrev) btnPrev.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
        if (btnNext) btnNext.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });

        // 닷
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); });
        });

        if (slides.length > 0) {
            slides[0].classList.add('active');
            if (dots[0]) dots[0].classList.add('active');
            startAuto();
        }
    }

    // ===== 스크롤 시 헤더 그림자 =====
    window.addEventListener('scroll', function () {
        const header = document.getElementById('header');
        if (header) {
            if (window.scrollY > 10) {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
            } else {
                header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
            }
        }
    });

    // ===== 탭 기능 =====
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const target = this.dataset.tab;
            const parent = this.closest('.tab-wrap');

            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            parent.querySelector('#' + target).classList.add('active');
        });
    });

});
