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


    };/* --- main.js 에 추가할 공지사항 매니저 로직 --- */
    NoticeManager = {
        // 1. 공지 데이터 (서버 대신 사용하는 데이터 바구니)
        data: [
            { id: 101, isFixed: true, title: "월촌캠핑장 이용 전 필독사항 안내", date: "2026-03-31", content: "월촌캠핑장을 이용해 주시는 모든 캠퍼님 환영합니다! 쾌적한 캠핑을 위해 밤 10시 이후 매너타임 준수 및 분리수거 철저히 부탁드립니다. 감사합니다." },
            { id: 1, isFixed: false, title: "4월 주말 예약 조기 마감 안내", date: "2026-03-28", content: "많은 성원 덕분에 4월의 모든 주말 예약이 마감되었습니다. 평일 잔여석은 실시간 예약창에서 확인 가능합니다." },
            { id: 2, isFixed: false, title: "홈페이지 예약 시스템 정기 점검 안내", date: "2026-03-20", content: "안정적인 서비스 제공을 위해 4월 1일 새벽에 시스템 점검이 진행될 예정입니다. 이용에 참고 부탁드립니다." }
        ],
        renderView: function (id) {
            const item = this.data.find(x => x.id === id);
            if (item) {
                document.getElementById('view-title').innerText = item.title;
                document.getElementById('view-date').innerText = item.date;
                document.getElementById('view-content').innerText = item.content;
            }
        },

        init: function () {
            this.listBody = document.getElementById('notice-list-body');
            if (!this.listBody) return;

            this.renderList();
            this.handleCommentSubmit();
        },

        // 리스트 렌더링
        renderList: function () {
            this.listBody.innerHTML = this.data.map((notice, idx) => `
            <tr style="${notice.isFixed ? 'background-color: #fffdf5;' : ''}">
                <td>${notice.isFixed ? '<strong>필독</strong>' : this.data.length - idx}</td>
                <td class="title">
                    <a href="javascript:void(0)" onclick="NoticeManager.viewDetail(${notice.id})">
                        ${notice.isFixed ? '<strong>' + notice.title + '</strong>' : notice.title}
                    </a>
                </td>
                <td>관리자</td>
                <td>${notice.date}</td>
            </tr>
        `).join('');
        },

        // 상세보기 및 해당 글 댓글 로드
        viewDetail: function (id) {
            const notice = this.data.find(n => n.id === id);
            const detailArea = document.getElementById('notice-detail-area');
            if (!notice || !detailArea) return;

            document.getElementById('detail-title').innerText = notice.title;
            document.getElementById('detail-date').innerText = notice.date;
            document.getElementById('detail-content').innerText = notice.content;
            detailArea.style.display = 'block';

            this.activeNoticeId = id; // 현재 보고 있는 공지글 ID 저장
            this.renderComments();

            // 부드럽게 화면 이동
            setTimeout(() => detailArea.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        },

        // 댓글 저장 로직 (parentId 사용)
        addComment: function (targetId, parentId, name, text) {
            const comments = JSON.parse(localStorage.getItem('notice_comments')) || [];
            const newComment = {
                id: Date.now(),
                targetId: targetId, // 어느 공지글인지
                parentId: parentId, // 부모 댓글 ID (없으면 null)
                name: name,
                content: text,
                date: new Date().toLocaleDateString()
            };
            comments.push(newComment);
            localStorage.setItem('notice_comments', JSON.stringify(comments));
            this.renderComments();
        },

        // 댓글 등록 버튼 핸들러
        handleCommentSubmit: function () {
            const form = document.getElementById('comment-form');
            if (!form) return;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('comment-name').value;
                const text = document.getElementById('comment-txt').value;
                this.addComment(this.activeNoticeId, null, name, text);
                form.reset();
            });
        },

        // 댓글 및 답글 렌더링
        renderComments: function () {
            const container = document.getElementById('comment-list-container');
            const allComments = JSON.parse(localStorage.getItem('notice_comments')) || [];
            const currentComments = allComments.filter(c => c.targetId === this.activeNoticeId);

            const parents = currentComments.filter(c => c.parentId === null);

            container.innerHTML = parents.map(p => {
                const children = currentComments.filter(c => c.parentId === p.id);
                return `
                <div style="margin-bottom:15px; padding:12px; border-bottom:1px solid #f2f2f2;">
                    <strong>${p.name}</strong> <small style="color:#999; margin-left:10px;">${p.date}</small>
                    <p style="margin:8px 0;">${p.content}</p>
                    <button onclick="NoticeManager.replyUI(${p.id})" style="font-size:11px; color:var(--primary); cursor:pointer; background:none; border:none;">[답글 달기]</button>
                    
                    <div style="margin-left:30px; margin-top:10px;">
                        ${children.map(c => `
                            <div style="background:#f7f7f7; padding:10px; border-radius:5px; margin-bottom:5px; font-size:0.9rem;">
                                <strong>ㄴ ${c.name}</strong> <small style="color:#999; margin-left:10px;">${c.date}</small>
                                <p style="margin:5px 0;">${c.content}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            }).join('') || '<p style="color:#999; font-size:0.9rem;">작성된 댓글이 없습니다.</p>';
        },

        // 답글 입력 팝업 (간단 구현)
        replyUI: function (parentId) {
            const text = prompt("답글 내용을 입력하세요:");
            if (text) this.addComment(this.activeNoticeId, parentId, "관리자", text);
        }
    };


    CampingUI.init();
    ResManager.init();
    NoticeManager.init();
});
/* --- NoticeManager: 관리자 기능 및 페이지 이동형으로 변경 --- */
window.NoticeManager = {
    // 1. 초기 기본 데이터 (장부가 비어있을 때만 사용)
    defaultData: [
        { id: 101, isFixed: true, title: "월촌캠핑장 이용 전 필독사항 안내", date: "2026-03-31", content: "매너타임 준수 부탁드립니다." },
        { id: 1, isFixed: false, title: "4월 주말 예약 조기 마감 안내", date: "2026-03-28", content: "평일 예약은 가능합니다." }
    ],

    init: function () {
        // 장부에 데이터가 없으면 기본 데이터를 채워넣음 (최초 1회)
        if (!localStorage.getItem('camping_notices')) {
            localStorage.setItem('camping_notices', JSON.stringify(this.defaultData));
        }

        const body = document.getElementById('notice-list-body');
        if (body) this.renderList(body);

        // 상세보기 페이지일 경우 실행
        if (document.getElementById('notice-view-content')) {
            this.renderView();
        }
    },

    // 2. 목록 출력: 이제 클릭 시 notice_view.html로 이동합니다
    renderList: function (target) {
        const notices = JSON.parse(localStorage.getItem('camping_notices')) || [];
        // 최신순 정렬 (필독 공지는 위로)
        const sorted = notices.sort((a, b) => (b.isFixed - a.isFixed) || (b.id - a.id));

        target.innerHTML = sorted.map((n, idx) => `
            <tr style="${n.isFixed ? 'background-color: #fffdf5;' : ''}">
                <td>${n.isFixed ? '<strong>필독</strong>' : sorted.length - idx}</td>
                <td class="title">
                    <a href="notice_view.html?id=${n.id}" style="${n.isFixed ? 'font-weight:bold;' : ''}">
                        ${n.title}
                    </a>
                </td>
                <td>관리자</td>
                <td>${n.date}</td>
            </tr>
        `).join('');
    },

    // 3. 상세보기 페이지 전용 렌더링
    renderView: function () {
        const params = new URLSearchParams(window.location.search);
        const id = parseInt(params.get('id'));
        const notices = JSON.parse(localStorage.getItem('camping_notices')) || [];
        const item = notices.find(x => x.id === id);

        if (item) {
            document.getElementById('view-title').innerText = item.title;
            document.getElementById('view-date').innerText = item.date;
            document.getElementById('view-content').innerText = item.content;
        } else {
            alert("존재하지 않는 게시글입니다.");
            location.href = 'notice.html';
        }
    }
};

// 기존의 CampingUI.init() 등과 충돌하지 않게 별도 실행
window.addEventListener('load', () => window.NoticeManager.init());