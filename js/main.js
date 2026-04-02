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
    // ===== [이점일 스튜디오] Flatpickr 달력 및 자동 스크롤 로직 =====
    const dateInput = document.getElementById('date-picker');
    const stepMap = document.getElementById('step-map');
    const stepSummary = document.getElementById('step-summary');
    const siteGroups = document.querySelectorAll('.site-group');

    if (dateInput) {
        // Flatpickr 엔진 가동
        flatpickr(dateInput, {
            mode: "range",
            minDate: "today",
            dateFormat: "Y-m-d",
            locale: "ko",
            onClose: function(selectedDates, dateStr) {
                if (selectedDates.length === 2) {
                    document.getElementById('res-date-val').innerText = dateStr;

                    // 다음 단계(지도) 노출
                    if(stepMap) stepMap.style.display = 'block';
                    
                    // CTO님이 설계하신 자동 스크롤 실행
                    setTimeout(() => {
                        stepMap.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            }
        });
    }

    if (siteGroups.length > 0) {
        // 지도 구역 클릭 이벤트
        siteGroups.forEach(group => {
            group.addEventListener('click', function() {
                siteGroups.forEach(g => g.classList.remove('selected'));
                this.classList.add('selected');
                
                const siteName = this.getAttribute('data-site');
                document.getElementById('res-site-val').innerText = siteName;

                // 마지막 요약 섹션 노출 및 스크롤
                if(stepSummary) stepSummary.style.display = 'block';
                setTimeout(() => {
                    stepSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            });
        });
    }
    // 예약정보입력으로 이동하며 정보 전송
    const nextBtn = document.getElementById('btn-next-step');
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault(); // 기본 링크 이동 방지

            // 현재 화면에 표시된 값 가져오기
            const dateVal = document.getElementById('res-date-val').innerText;
            const siteVal = document.getElementById('res-site-val').innerText;

            if (siteVal === "-") {
                alert("구역을 먼저 선택해 주세요!");
                return;
            }

            // 데이터를 주소창(Query String)에 담아 이동
            // 결과 예시: reservation2.html?date=2026-04-10&site=A-1
            location.href = `reservation2.html?date=${encodeURIComponent(dateVal)}&site=${encodeURIComponent(siteVal)}`;
        });
    }

    // =====  URL 파라미터 수신 및 표시 로직 =====
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('date');
    const selectedSite = urlParams.get('site');

    if (document.getElementById('summary-date')) {
        document.getElementById('summary-date').innerText = selectedDate || "선택된 날짜 없음";
        document.getElementById('summary-site').innerText = selectedSite || "선택된 구역 없음";
    }

    // =====  인원수 직접 입력 제어 로직 =====
    const adultSelect = document.getElementById('adult_count');
    const adultManualInput = document.getElementById('adult_manual_input');

    if (adultSelect && adultManualInput) {
        adultSelect.addEventListener('change', function() {
            if (this.value === 'manual') {
                // '직접 입력' 선택 시 인풋창 노출
                adultManualInput.style.display = 'block';
                adultManualInput.focus(); // 바로 입력할 수 있게 커서 이동
                adultManualInput.required = true; // 필수 입력으로 변경
            } else {
                // 다른 인원 선택 시 인풋창 숨김
                adultManualInput.style.display = 'none';
                adultManualInput.required = false;
                adultManualInput.value = ''; // 입력값 초기화
            }
        });
    }

    //  데이터 DB 전송 후 페이지 이동
    const form2 = document.getElementById('reservation-detail-form');
    
    if (form2) {
        form2.addEventListener('submit', function(e) {
            e.preventDefault();

            // 1. 전송할 데이터 취합
            const urlParams = new URLSearchParams(window.location.search);
            const formData = {
                date: urlParams.get('date'),
                site: urlParams.get('site'),
                name: this.guest_name.value,
                phone: this.guest_phone.value,
                adults: this.adult_count.value === 'manual' ? this.adult_count_manual.value : this.adult_count.value,
                children: this.child_count.value,
                car: this.car_number.value,
                request: this.special_request.value,
                status: "pending" // 결제 대기 상태
            };

            console.log("DB로 전송할 데이터:", formData);

            // 2. 서버로 데이터 전송 (실제 DB 연결 시 fetch 사용)
            /*
            fetch('https://api.your-server.com/reservation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                location.href = 'reservation3.html'; // 성공 시 이동
            });
            */

            // 지금은 서버가 없으므로 성공했다고 가정하고 바로 이동시킵니다.
            alert("예약 정보가 안전하게 접수되었습니다.");
            location.href = 'reservation3.html';
        });
    }

});
