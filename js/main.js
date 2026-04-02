/* ==========================================
   월촌캠핑장 - 통합 관리 스크립트 (The 2.1 Studio)
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {
    // 1. 공통 UI 매니저 (메뉴, 슬라이더, 헤더 등)
    const CampingUI = {
        init: function () {
            this.handleMobileMenu();
            this.handleHeaderShadow();
            this.initSlider();
            this.initTabs();
        },
        handleMobileMenu: function () {
            const btnMenu = document.getElementById('btn-menu');
            const mainNav = document.getElementById('main-nav');
            const btnClose = document.getElementById('btn-menu-close');
            if (btnMenu) btnMenu.addEventListener('click', () => mainNav.classList.add('open'));
            if (btnClose) btnClose.addEventListener('click', () => mainNav.classList.remove('open'));
        },
        handleHeaderShadow: function () {
            const header = document.getElementById('header');
            window.addEventListener('scroll', () => {
                if (header) header.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.12)' : '0 2px 20px rgba(0,0,0,0.08)';
            });
        },
        initSlider: function () {
            const slider = document.querySelector('.main-slider');
            if (!slider) return;
            const slides = slider.querySelectorAll('.slide');
            const dots = slider.querySelectorAll('.dot');
            let current = 0, timer;
            const goTo = (n) => {
                slides[current].classList.remove('active');
                if (dots[current]) dots[current].classList.remove('active');
                current = (n + slides.length) % slides.length;
                slides[current].classList.add('active');
                if (dots[current]) dots[current].classList.add('active');
            };
            const start = () => timer = setInterval(() => goTo(current + 1), 4000);
            const stop = () => clearInterval(timer);
            slider.querySelector('.slider-prev')?.addEventListener('click', () => { stop(); goTo(current - 1); start(); });
            slider.querySelector('.slider-next')?.addEventListener('click', () => { stop(); goTo(current + 1); start(); });
            dots.forEach((dot, i) => dot.addEventListener('click', () => { stop(); goTo(i); start(); }));
            if (slides.length > 0) { slides[0].classList.add('active'); dots[0]?.classList.add('active'); start(); }
        },
        initTabs: function () {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const parent = this.closest('.tab-wrap');
                    parent.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                    parent.querySelector('#' + this.dataset.tab).classList.add('active');
                });
            });
        }
    };

    // 2. 예약 시스템 매니저
    const ResManager = {
        init: function () {
            this.params = new URLSearchParams(window.location.search);
            this.handleStep1(); // 날짜/구역 선택
            this.handleStep2(); // 정보 입력
            this.displaySummary(); // 요약 바 출력
        },
        // URL 데이터 가져오기 헬퍼
        getParam: function (key) { return this.params.get(key); },
        // 부드러운 스크롤 헬퍼
        smoothScroll: function (id, block = 'start') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: block });
        },
        handleStep1: function () {
            // 1. 인라인 달력 설정 및 요금 계산
            const calendarEl = document.getElementById('inline-calendar');
            if (calendarEl) {
                flatpickr(calendarEl, {
                    inline: true, // 팝업 없이 즉시 노출
                    mode: "range", minDate: "today", dateFormat: "Y-m-d", locale: "ko",
                    onChange: (dates, str) => {
                        if (dates.length === 2) {
                            document.getElementById('res-date-val').innerText = str;

                            // [핵심] 1박 5만원 실시간 요금 계산
                            const diffDays = Math.ceil(Math.abs(dates[1] - dates[0]) / (1000 * 60 * 60 * 24));
                            const totalPrice = diffDays * 50000;
                            const priceEl = document.getElementById('final-price');
                            if (priceEl) priceEl.innerText = totalPrice.toLocaleString() + "원";

                            const stepMap = document.getElementById('step-map');
                            if (stepMap) stepMap.style.display = 'block';
                            setTimeout(() => this.smoothScroll('step-map'), 200);
                        }
                    }
                });
            }

            // 2. 구역 클릭 시 하이라이트 (기존 로직 유지)
            document.querySelectorAll('.site-group').forEach(group => {
                group.addEventListener('click', function () {
                    document.querySelectorAll('.site-group').forEach(g => g.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('res-site-val').innerText = this.dataset.site;

                    const stepSummary = document.getElementById('step-summary');
                    if (stepSummary) stepSummary.style.display = 'block';
                    setTimeout(() => ResManager.smoothScroll('step-summary', 'center'), 200);
                });
            });

            // 3. 다음 단계 이동
            document.getElementById('btn-next-step')?.addEventListener('click', (e) => {
                e.preventDefault();
                const d = document.getElementById('res-date-val').innerText;
                const s = document.getElementById('res-site-val').innerText;
                if (s === "-") return alert("구역을 먼저 선택해 주세요!");
                location.href = `reservation2.html?date=${encodeURIComponent(d)}&site=${encodeURIComponent(s)}`;
            });
        },
        handleStep2: function () {
            const form = document.getElementById('reservation-detail-form');
            if (!form) return;

            // 1.  성인 인원 직접 입력 로직
            const adultSelect = document.getElementById('adult_count');
            const adultManual = document.getElementById('adult_manual_input');

            adultSelect?.addEventListener('change', function () {
                const isManual = this.value === 'manual';
                adultManual.style.display = isManual ? 'block' : 'none';
                if (isManual) {
                    adultManual.focus();
                    adultManual.required = true;
                } else {
                    adultManual.required = false;
                }
            });

            // 1-1 아동 인원 직접 입력 로직
            const childSelect = document.getElementById('child_count');
            const childManual = document.getElementById('child_manual_input');

            childSelect?.addEventListener('change', function () {
                const isManual = this.value === 'manual';
                childManual.style.display = isManual ? 'block' : 'none';
                if (isManual) {
                    childManual.focus();
                    childManual.required = true;
                } else {
                    childManual.required = false;
                }
            });

            // 2. [신규 추가] 입력 제한 로직 (전화번호, 차량번호)
            const phoneInput = form.querySelector('input[name="guest_phone"]');
            const carInput = form.querySelector('input[name="car_number"]');

            // 숫자와 하이픈(-)만 허용
            phoneInput?.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9-]/g, '');
            });

            // 영어 입력 방지
            carInput?.addEventListener('input', function () {
                this.value = this.value.replace(/[a-zA-Z]/g, '');
            });

            // 3. [기존+검증 추가] 서버 전송 시뮬레이션
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                // [신규] 전화번호 자리수 최종 검증 (지역번호 9자~휴대폰 11자)
                const phoneValue = phoneInput.value.replace(/-/g, '');
                if (phoneValue.length < 9 || phoneValue.length > 11) {
                    alert("전화번호 형식이 올바르지 않습니다. 다시 확인해 주세요.");
                    phoneInput.focus();
                    return;
                }

                // 버튼 상태 변경 및 이동
                const btn = document.getElementById('btn-next-to-pay');
                if (btn) {
                    btn.innerText = "전송 중...";
                    btn.disabled = true;
                }

                setTimeout(() => {
                    alert("예약 정보가 안전하게 접수되었습니다.");
                    location.href = 'reservation3.html';
                }, 1000);
            });
        },
        displaySummary: function () {
            const d = document.getElementById('summary-date');
            const s = document.getElementById('summary-site');
            if (d) d.innerText = this.getParam('date') || "선택된 날짜 없음";
            if (s) s.innerText = this.getParam('site') || "선택된 구역 없음";
        }
    };

    CampingUI.init();
    ResManager.init();
});