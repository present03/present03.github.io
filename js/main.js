/* ==========================================
   월촌캠핑장 - 통합 관리 스크립트 (The 2.1 Studio)
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {
    // 1. 공통 UI 매니저
    const CampingUI = {
        init: function () {
            this.handleMobileMenu();
            this.handleHeaderShadow();
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
        }
    };

    // 2. 예약 시스템 매니저
    const ResManager = {
        init: function () {
            this.params = new URLSearchParams(window.location.search);
            this.handleStep1();    // reservation.html
            this.handleStep2();    // reservation2.html
            this.handleStep3();    // reservation3.html
            this.displaySummary(); // 공통 요약바
            this.handleConfirmPage(); // confirm.html
        },
        getParam: function (key) { return this.params.get(key); },
        smoothScroll: function (id, block = 'start') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: block });
        },

        // [Step 1] 날짜 및 구역 선택
        handleStep1: function () {
            const calendarEl = document.getElementById('inline-calendar');
            if (!calendarEl) return;

            flatpickr(calendarEl, {
                inline: true, mode: "range", minDate: "today", dateFormat: "Y-m-d", locale: "ko",
                onChange: (dates, str) => {
                    if (dates.length === 2) {
                        const [selStart, selEnd] = dates;
                        document.getElementById('res-date-val').innerText = str;

                        // 지도 초기화 및 중복 체크
                        document.querySelectorAll('.site-group').forEach(g => {
                            g.classList.remove('booked');
                            g.style.pointerEvents = 'auto';
                        });

                        try {
                            const allBookings = JSON.parse(localStorage.getItem('booked_sites_list')) || [];
                            allBookings.forEach(booking => {
                                if (booking && booking.date) {
                                    const bDates = booking.date.split(' ~ ').map(d => new Date(d));
                                    if (bDates.length === 2 && selStart < bDates[1] && selEnd > bDates[0]) {
                                        const target = document.querySelector(`.site-group[data-site="${booking.site}"]`);
                                        if (target) { target.classList.add('booked'); target.style.pointerEvents = 'none'; }
                                    }
                                }
                            });
                        } catch (e) { console.error("데이터 읽기 오류"); }

                        const diffDays = Math.ceil(Math.abs(selEnd - selStart) / 86400000);
                        const priceEl = document.getElementById('final-price');
                        if (priceEl) priceEl.innerText = (diffDays * 50000).toLocaleString() + "원";

                        document.getElementById('step-map').style.display = 'block';
                        setTimeout(() => this.smoothScroll('step-map'), 200);
                    }
                }
            });

            document.querySelectorAll('.site-group').forEach(group => {
                group.addEventListener('click', function () {
                    if (this.classList.contains('booked')) return;
                    document.querySelectorAll('.site-group').forEach(g => g.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('res-site-val').innerText = this.dataset.site;
                    document.getElementById('step-summary').style.display = 'block';
                    setTimeout(() => ResManager.smoothScroll('step-summary', 'center'), 200);
                });
            });

            document.getElementById('btn-next-step')?.addEventListener('click', (e) => {
                e.preventDefault();
                const d = document.getElementById('res-date-val').innerText;
                const s = document.getElementById('res-site-val').innerText;
                if (s === "-") return alert("구역을 선택해 주세요!");
                location.href = `reservation2.html?date=${encodeURIComponent(d)}&site=${encodeURIComponent(s)}`;
            });
        },
        // [Step 2] 정보 입력 및 제출 (버튼 먹통 해결)
        handleStep2: function () {
            const form = document.getElementById('reservation-detail-form');
            if (!form) return;
            setTimeout(() => this.smoothScroll('reservation-detail-form', 'start'), 500);

            // 1. 인원 선택 토글 로직
            const setupToggle = (sId, mId) => {
                const sel = document.getElementById(sId);
                const man = document.getElementById(mId);
                if (sel && man) {
                    sel.addEventListener('change', function () {
                        man.style.display = this.value === 'manual' ? 'block' : 'none';
                    });
                }
            };
            setupToggle('adult_count', 'adult_manual_input');
            setupToggle('child_count', 'child_manual_input');

            // 2. 날짜에 따른 요금 미리 계산
            const dateRange = this.getParam('date') || "";
            if (dateRange.includes(' ~ ')) {
                const dates = dateRange.split(' ~ ');
                const nights = Math.ceil(Math.abs(new Date(dates[1]) - new Date(dates[0])) / 86400000);
                const priceEl = document.getElementById('final-price');
                if (priceEl) priceEl.innerText = (nights * 50000).toLocaleString() + "원";
            }

            // 3. [핵심] 제출 이벤트 리스너 - 모든 로직은 이 '안'에 있어야 합니다
            form.addEventListener('submit', (e) => {
                e.preventDefault(); // 이제 'e'가 정의된 곳 안으로 들어와서 에러가 안 납니다!

                // 데이터 수집 함수
                const getCount = (selId, manId) => {
                    const sel = document.getElementById(selId);
                    return sel.value === 'manual' ? (document.getElementById(manId)?.value || "0") + "명" : sel.value + "명";
                };

                try {
                    const reservationData = {
                        name: document.getElementById('guest_name')?.value.trim() || "미입력",
                        car: document.getElementById('car_number')?.value || "없음",
                        phone: form.querySelector('input[name="guest_phone"]')?.value || "",
                        price: document.getElementById('final-price')?.innerText || "0원",
                        people: `성인 ${getCount('adult_count', 'adult_manual_input')}, 아동 ${getCount('child_count', 'child_manual_input')}`,
                        date: this.getParam('date') || "",
                        site: this.getParam('site') || "",
                        status: "결제대기",
                        bookedAt: Date.now() // 타이머 시작 시간
                    };

                    // 데이터 저장
                    let totalList = JSON.parse(localStorage.getItem('total_reservations')) || [];
                    if (!Array.isArray(totalList)) totalList = [];
                    totalList.push(reservationData);
                    localStorage.setItem('total_reservations', JSON.stringify(totalList));

                    // [추가] 3. 지도 차단용 리스트 저장
                    let list = JSON.parse(localStorage.getItem('booked_sites_list')) || [];
                    if (!Array.isArray(list)) list = [];
                    list.push({ date: reservationData.date, site: reservationData.site });
                    localStorage.setItem('booked_sites_list', JSON.stringify(list));

                    alert("예약 신청이 완료되었습니다!");
                    location.href = 'reservation3.html';

                } catch (err) {
                    console.error("저장 중 오류 발생:", err);
                    alert("정보 저장 중 문제가 발생했습니다.");
                }
            });
        },
        // [Step 3] 3시간 타이머
        handleStep3: function () {
            const countdownEl = document.getElementById('countdown');
            const savedData = JSON.parse(localStorage.getItem('temp_reservation'));
            if (!savedData || !savedData.bookedAt || !countdownEl) return;

            const limitTime = savedData.bookedAt + (3 * 60 * 60 * 1000);
            const timer = setInterval(() => {
                const remain = limitTime - Date.now();
                if (remain <= 0) {
                    countdownEl.innerText = "시간 초과 (자동 취소)";
                    return clearInterval(timer);
                }
                const h = String(Math.floor(remain / 3600000)).padStart(2, '0');
                const m = String(Math.floor((remain % 3600000) / 60000)).padStart(2, '0');
                const s = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
                countdownEl.innerText = `${h}:${m}:${s}`;
            }, 1000);
        },

        displaySummary: function () {
            const d = document.getElementById('summary-date');
            const s = document.getElementById('summary-site');
            if (d) d.innerText = this.getParam('date') || "선택 없음";
            if (s) s.innerText = this.getParam('site') || "선택 없음";
        },
        handleConfirmPage: function () {
            const btn = document.getElementById('btn-check-res');
            if (!btn) return;

            btn.addEventListener('click', () => {
                const name = document.getElementById('check-name').value.trim();
                const phone = document.getElementById('check-phone').value.trim();
                const container = document.getElementById('res-list-container'); // confirm.html에 추가한 id
                const resultArea = document.getElementById('confirm-result');

                if (!name || !phone) return alert("정보를 모두 입력해 주세요.");

                // [핵심] 통합 장부에서 일치하는 모든 내역 필터링
                const totalRes = JSON.parse(localStorage.getItem('total_reservations')) || [];
                const matches = totalRes.filter(r => r.name === name && r.phone === phone);

                if (matches.length > 0) {
                    container.innerHTML = ""; // 이전 결과 초기화

                    matches.forEach(data => {
                        const card = document.createElement('div');
                        card.style = "background:#f9f9f9; padding:20px; border-radius:10px; line-height:1.8; font-size:0.95rem; margin-bottom:15px; border:1px solid #eee; text-align:left;";

                        // 결제 대기 시 마감 시간 계산
                        let deadlineHtml = "";
                        if (data.status === "결제대기" && data.bookedAt) {
                            const limit = data.bookedAt + (3 * 60 * 60 * 1000);
                            deadlineHtml = `<p style="margin-top:8px; font-size:0.9rem;"><strong>입금마감:</strong> <span style="color:#e74c3c; font-weight:bold;">${this.formatTime(limit)}</span></p>`;
                        }

                        card.innerHTML = `
                    <p><strong>예약날짜:</strong> ${data.date}</p>
                    <p><strong>예약구역:</strong> ${data.site}</p>
                    <p><strong>차량번호:</strong> ${data.car}</p>
                    <p><strong>예약인원:</strong> ${data.people}</p>
                    <p><strong>결제금액:</strong> ${data.price}</p>
                    <p><strong>예약상태:</strong> <span style="font-weight:bold; color:${data.status === "예약완료" ? "#2ecc71" : "#e74c3c"}">${data.status}</span></p>
                    ${deadlineHtml}
                `;
                        container.appendChild(card);
                    });

                    resultArea.style.display = 'block';

                    // [추가] 조회 결과창으로 부드럽게 자동 스크롤
                    setTimeout(() => {
                        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);

                } else {
                    alert("일치하는 예약 정보를 찾을 수 없습니다.");
                    resultArea.style.display = 'none';
                }
            });
        },
        formatTime: function (ts) {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },


    };

    CampingUI.init();
    ResManager.init();
});