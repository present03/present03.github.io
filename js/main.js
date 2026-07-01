/* ==========================================
   월촌캠핑장 - 통합 관리 스크립트 (The 2.1 Studio)
   ========================================== */
let NoticeManager;

document.addEventListener('DOMContentLoaded', function () {
    // 1. 공통 UI 매니저
    /* --- CampingUI 객체 전체 교체 --- */
    const CampingUI = {
        init: function () {
            this.handleMobileMenu();
            this.handleHeaderShadow();
            this.initSlider(); // 메인 페이지 슬라이더 복구
            this.initTabs();   // 사이트 안내 페이지 탭 복구
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

        // [복구] 메인 배너 슬라이더 회전 로직
        initSlider: function () {
            const slider = document.querySelector('.main-slider');
            if (!slider) return;

            const slides = slider.querySelectorAll('.slide');
            const dots = slider.querySelectorAll('.dot');
            const prevBtn = slider.querySelector('.slider-prev');
            const nextBtn = slider.querySelector('.slider-next');
            let current = 0;
            let timer;

            const showSlide = (n) => {
                slides.forEach(s => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                current = (n + slides.length) % slides.length;
                slides[current].classList.add('active');
                dots[current].classList.add('active');
            };

            const startAutoPlay = () => {
                timer = setInterval(() => showSlide(current + 1), 5000); // 5초마다 회전
            };

            const resetTimer = () => {
                clearInterval(timer);
                startAutoPlay();
            };

            if (nextBtn) nextBtn.addEventListener('click', () => { showSlide(current + 1); resetTimer(); });
            if (prevBtn) prevBtn.addEventListener('click', () => { showSlide(current - 1); resetTimer(); });

            dots.forEach((dot, idx) => {
                dot.addEventListener('click', () => { showSlide(idx); resetTimer(); });
            });

            // 초기 실행
            showSlide(0);
            startAutoPlay();
        },

        // [복구] 구역별 자리 소개 탭 전환 로직
        initTabs: function () {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            if (tabBtns.length === 0) return;

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.tab;

                    // 모든 버튼과 컨텐츠의 active 클래스 제거
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    // 클릭한 요소만 활성화
                    btn.classList.add('active');
                    const targetContent = document.getElementById(targetId);
                    if (targetContent) targetContent.classList.add('active');
                });
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
                                    const bDates = booking.date.split(' ~ ').map(d => {
                                        const [y, m, day] = d.split('-').map(Number);
                                        return new Date(y, m - 1, day, 0, 0, 0); // 로컬 시간 기준 00시로 생성
                                    });

                                    if (bDates.length === 2) {
                                        // 퇴실일 당일 입실 허용 공식
                                        if (selStart < bDates[1] && selEnd > bDates[0]) {
                                            const target = document.querySelector(`.site-group[data-site="${booking.site}"]`);
                                            if (target) {
                                                target.classList.add('booked');
                                                target.style.pointerEvents = 'none';
                                            }
                                        }
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

            // 1. 인원 선택 토글 (통합 인원 하나만 관리)
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

            // 2. 요금 미리 계산
            const dateRange = this.getParam('date') || "";
            if (dateRange.includes(' ~ ')) {
                const dates = dateRange.split(' ~ ');
                const nights = Math.ceil(Math.abs(new Date(dates[1]) - new Date(dates[0])) / 86400000);
                const priceEl = document.getElementById('final-price');
                if (priceEl) priceEl.innerText = (nights * 50000).toLocaleString() + "원";
            }

            // 3. 제출 이벤트 리스너
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const selDateStr = this.getParam('date');
                const selSite = this.getParam('site');
                const parseDate = (d) => {
                    const [y, m, day] = d.split('-').map(Number);
                    return new Date(y, m - 1, day, 0, 0, 0);
                };

                // [중요] 최종 중복 체크: 결제 직전 다시 한번 금고 확인
                try {
                    const currentBookings = JSON.parse(localStorage.getItem('booked_sites_list')) || [];
                    if (selDateStr && selDateStr.includes(' ~ ')) {
                        const [sStr, eStr] = selDateStr.split(' ~ ');
                        const selStart = parseDate(sStr);
                        const selEnd = parseDate(eStr);

                        const isAlreadyTaken = currentBookings.some(booking => {
                            if (booking.site !== selSite) return false;
                            const bDates = booking.date.split(' ~ ').map(d => parseDate(d));
                            return (selStart < bDates[1] && selEnd > bDates[0]);
                        });

                        if (isAlreadyTaken) {
                            alert("⚠️ 죄송합니다. 정보를 입력하시는 사이에 해당 날짜/구역 예약이 먼저 완료되었습니다.");
                            location.href = 'reservation.html';
                            return;
                        }
                    }
                } catch (err) { console.error("중복 체크 오류"); }

                // 4. 데이터 수집 및 저장
                const getCount = (selId, manId) => {
                    const sel = document.getElementById(selId);
                    return sel.value === 'manual' ? (document.getElementById(manId)?.value || "0") + "명" : sel.value + "명";
                };

                try {
                    const reservationData = {
                        name: document.getElementById('guest_name')?.value.trim() || "미입력",
                        car: document.getElementById('car_number')?.value.trim() || "차량없음", // 선택 사항 처리
                        phone: form.querySelector('input[name="guest_phone"]')?.value || "",
                        price: document.getElementById('final-price')?.innerText || "0원",
                        people: getCount('adult_count', 'adult_manual_input'), // 인원 통합
                        date: selDateStr,
                        site: selSite,
                        status: "결제대기",
                        bookedAt: Date.now()
                    };

                    localStorage.setItem('temp_reservation', JSON.stringify(reservationData));

                    let totalList = JSON.parse(localStorage.getItem('total_reservations')) || [];
                    totalList.push(reservationData);
                    localStorage.setItem('total_reservations', JSON.stringify(totalList));

                    let list = JSON.parse(localStorage.getItem('booked_sites_list')) || [];
                    list.push({ date: reservationData.date, site: reservationData.site });
                    localStorage.setItem('booked_sites_list', JSON.stringify(list));

                    alert("예약 신청이 완료되었습니다!");
                    location.href = 'reservation3.html';

                } catch (err) {
                    alert("정보 저장 중 문제가 발생했습니다.");
                }
            });
        },
        // [Step 3] 3시간 타이머
        handleStep3: function () {
            const countdownEl = document.getElementById('countdown');
            const priceEl = document.getElementById('final-price');
            const savedData = JSON.parse(localStorage.getItem('temp_reservation')); // 이제 데이터가 정상적으로 잡힙니다

            if (!savedData || !savedData.bookedAt || !countdownEl) return;

            // 저장된 실제 금액으로 화면 교체
            if (priceEl) priceEl.innerText = savedData.price;

            // 3시간 타이머 로직 시작
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

            // 전역에서 취소 함수를 호출할 수 있도록 연결
            window.ResManager = this;

            btn.addEventListener('click', () => {
                const name = document.getElementById('check-name').value.trim();
                const phone = document.getElementById('check-phone').value.trim();
                const container = document.getElementById('res-list-container');
                const resultArea = document.getElementById('confirm-result');

                if (!name || !phone) return alert("정보를 모두 입력해 주세요.");

                const totalRes = JSON.parse(localStorage.getItem('total_reservations')) || [];
                const matches = totalRes.filter(r => r.name === name && r.phone === phone);

                if (matches.length > 0) {
                    container.innerHTML = "";

                    matches.forEach(data => {
                        const card = document.createElement('div');
                        card.style = "background:#f9f9f9; padding:20px; border-radius:10px; line-height:1.8; font-size:0.95rem; margin-bottom:15px; border:1px solid #eee; text-align:left;";

                        // 1. 취소 버튼 생성 (결제대기 상태일 때만)
                        let cancelBtnHtml = "";
                        if (data.status === "결제대기") {
                            cancelBtnHtml = `
                        <button onclick="ResManager.deleteReservation(${data.bookedAt}, '${data.date}', '${data.site}')"
                                style="margin-top:15px; width:100%; padding:10px; background:#fff; border:1px solid #e74c3c; color:#e74c3c; border-radius:6px; cursor:pointer; font-weight:bold;">
                            예약 취소하기 (입금 전)
                        </button>`;
                        }

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
                    ${cancelBtnHtml}
                `;
                        container.appendChild(card);
                    });

                    resultArea.style.display = 'block';
                    setTimeout(() => { resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                } else {
                    alert("일치하는 예약 정보를 찾을 수 없습니다.");
                    resultArea.style.display = 'none';
                }
            });
        },

        // 예약 취소 실행 함수
        deleteReservation: function (bookedAt, date, site) {
            if (confirm(`${date} [${site}] 예약을 취소하시겠습니까?\n취소 시 해당 슬롯은 즉시 개방됩니다.`)) {
                // 1. 전체 장부에서 삭제
                let total = JSON.parse(localStorage.getItem('total_reservations')) || [];
                total = total.filter(r => r.bookedAt !== bookedAt);
                localStorage.setItem('total_reservations', JSON.stringify(total));

                // 2. 지도 예약 현황(중복 체크용)에서 삭제
                let bookedList = JSON.parse(localStorage.getItem('booked_sites_list')) || [];
                bookedList = bookedList.filter(b => !(b.date === date && b.site === site));
                localStorage.setItem('booked_sites_list', JSON.stringify(bookedList));

                alert("예약이 정상적으로 취소되었습니다.");
                location.reload(); // 화면 새로고침하여 반영
            }
        },
        formatTime: function (ts) {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },


    };/* --- main.js 에 추가할 공지사항 매니저 로직 --- */

    CampingUI.init();
    ResManager.init();
    window.NoticeManager.init();
});

/* ==========================================
   공지사항 저장소
   - 현재: localStorage 사용
   - 나중에 서버/DB 연결 시 이 객체만 교체하면 됨
   ========================================== */
window.NoticeDB = {
    storageKey: 'camping_notices',

    defaultData: [
        {
            id: 101,
            isFixed: true,
            title: "월촌캠핑장 이용 전 필독사항 안내",
            date: "2026.03.31",
            author: "관리자",
            content: "매너타임 준수 부탁드립니다."
        },
        {
            id: 1,
            isFixed: false,
            title: "4월 주말 예약 조기 마감 안내",
            date: "2026.03.28",
            author: "관리자",
            content: "평일 예약은 가능합니다."
        }
    ],

    // 공지 목록 불러오기
    async getAll() {
        const savedData = localStorage.getItem(this.storageKey);

        if (!savedData) {
            localStorage.setItem(this.storageKey, JSON.stringify(this.defaultData));
            return this.defaultData;
        }

        return JSON.parse(savedData);
    },

    // 특정 공지 하나 불러오기
    async getById(id) {
        const notices = await this.getAll();
        return notices.find(notice => notice.id === Number(id));
    },

    // 새 공지 저장
    async create(noticeData) {
        const notices = await this.getAll();

        const nextId = notices.length > 0
            ? Math.max(...notices.map(notice => notice.id)) + 1
            : 1;

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

        const newNotice = {
            id: nextId,
            title: noticeData.title,
            content: noticeData.content,
            author: noticeData.author || "관리자",
            date: noticeData.date || today,
            isFixed: Boolean(noticeData.isFixed),
            createdAt: Date.now()
        };

        notices.push(newNotice);
        localStorage.setItem(this.storageKey, JSON.stringify(notices));

        return newNotice;
    },

    // 공지 삭제
    async delete(id) {
        const notices = await this.getAll();
        const filteredNotices = notices.filter(notice => notice.id !== Number(id));

        localStorage.setItem(this.storageKey, JSON.stringify(filteredNotices));

        return true;
    }
};


/* ==========================================
   공지사항 화면 관리자
   ========================================== */
window.NoticeManager = {
    init: async function () {
        const noticeListBody = document.getElementById('notice-list-body');
        const mainNoticeList = document.getElementById('main-notice-list');
        const viewTitle = document.getElementById('view-title');
        const adminForm = document.getElementById('admin-notice-form');
        const adminListBody = document.getElementById('admin-notice-list');

        if (noticeListBody) await this.renderList(noticeListBody);
        if (mainNoticeList) await this.renderMainList(mainNoticeList);
        if (viewTitle) await this.renderView();
        if (adminForm) this.bindAdminForm(adminForm);
        if (adminListBody) await this.renderAdminList(adminListBody);
    },

    // 필독 우선, 그다음 최신순 정렬
    sortNotices: function (notices) {
        return [...notices].sort((a, b) => {
            if (b.isFixed !== a.isFixed) return b.isFixed - a.isFixed;
            return b.id - a.id;
        });
    },

    // HTML 깨짐/삽입 방지용
    escapeHtml: function (text) {
        return String(text)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    },

    // notice.html 목록 출력
    renderList: async function (target) {
        const notices = await window.NoticeDB.getAll();
        const sorted = this.sortNotices(notices);

        target.innerHTML = sorted.map((notice, index) => `
            <tr style="${notice.isFixed ? 'background-color:#fffdf5;' : ''}">
                <td>${notice.isFixed ? '<strong>필독</strong>' : sorted.length - index}</td>
                <td class="title">
                    <a href="notice_view.html?id=${notice.id}" style="${notice.isFixed ? 'font-weight:bold;' : ''}">
                        ${this.escapeHtml(notice.title)}
                    </a>
                </td>
                <td>${this.escapeHtml(notice.author || '관리자')}</td>
                <td>${this.escapeHtml(notice.date)}</td>
            </tr>
        `).join('');
    },

    // index.html 메인 공지 일부 출력
    renderMainList: async function (target) {
        const notices = await window.NoticeDB.getAll();
        const sorted = this.sortNotices(notices).slice(0, 5);

        target.innerHTML = sorted.map(notice => `
            <li>
                <a href="notice_view.html?id=${notice.id}">
                    <span>
                        ${notice.isFixed ? '<span class="badge">필독</span>' : ''}
                        ${this.escapeHtml(notice.title)}
                    </span>
                    <span class="date">${this.escapeHtml(notice.date)}</span>
                </a>
            </li>
        `).join('');
    },

    // notice_view.html 상세 출력
    renderView: async function () {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        const notice = await window.NoticeDB.getById(id);

        if (!notice) {
            document.getElementById('view-title').innerText = "존재하지 않는 공지입니다.";
            document.getElementById('view-date').innerText = "-";
            document.getElementById('view-content').innerText = "삭제되었거나 잘못된 주소입니다.";
            return;
        }

        document.getElementById('view-title').innerText = notice.title;
        document.getElementById('view-date').innerText = notice.date;
        document.getElementById('view-content').innerText = notice.content;
    },

    // 관리자 글쓰기 폼 연결
    bindAdminForm: function (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const title = document.getElementById('notice-title').value.trim();
            const content = document.getElementById('notice-content').value.trim();
            const isFixed = document.getElementById('notice-fixed').checked;

            if (!title || !content) {
                alert("제목과 내용을 모두 입력해 주세요.");
                return;
            }

            const newNotice = await window.NoticeDB.create({
                title,
                content,
                isFixed,
                author: "관리자"
            });

            alert("공지사항이 등록되었습니다.");
            location.href = `notice_view.html?id=${newNotice.id}`;
        });
    },

    // 관리자 페이지 목록 출력
    renderAdminList: async function (target) {
        const notices = await window.NoticeDB.getAll();
        const sorted = this.sortNotices(notices);

        target.innerHTML = sorted.map(notice => `
            <tr>
                <td>${notice.isFixed ? '<strong>필독</strong>' : notice.id}</td>
                <td class="title">${this.escapeHtml(notice.title)}</td>
                <td>${this.escapeHtml(notice.date)}</td>
                <td>
                    <button 
                        type="button" 
                        onclick="window.NoticeManager.deleteNotice(${notice.id})"
                        style="padding:6px 12px; border:1px solid #e74c3c; background:#fff; color:#e74c3c; border-radius:5px; cursor:pointer;">
                        삭제
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 관리자 페이지 삭제 기능
    deleteNotice: async function (id) {
        if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;

        await window.NoticeDB.delete(id);
        alert("삭제되었습니다.");
        location.reload();
    }
};