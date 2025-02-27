import { LightningElement, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import getAccountsByEmail from '@salesforce/apex/AccountController.getAccountsByEmail';
import createCase from '@salesforce/apex/CaseController.createCase';
import AOS from '@salesforce/resourceUrl/AOS';           
import Particles from '@salesforce/resourceUrl/Particle';

export default class WebToCase extends LightningElement {
    static renderMode = 'light';
    @track currentStep = 1;
    @track resultMessage = '';
    @track userData = {
        email: '',
        accountId: '',
        type: '',
        scheduledDate: '',
        description: ''
    };
    aosInitialized = false;
    particlesInitialized = false;

    get isStep1() { return this.currentStep === 1; }
    get isStep2() { return this.currentStep === 2; }
    get isStep3() { return this.currentStep === 3; }
    get isStep4() { return this.currentStep === 4; }

    get shouldShowScheduledDate() {
        return this.userData.type === 'AS' || this.userData.type === 'Installation';
    }

    renderedCallback() {
        // AOS 초기화
        if (!this.aosInitialized) {
            loadStyle(this, AOS + '/aos-master/dist/aos.css')
                .then(() => loadScript(this, AOS + '/aos-master/dist/aos.js'))
                .then(() => {
                    window.AOS.init({ duration: 1200 });
                    this.aosInitialized = true;
                })
                .catch(error => { console.error('Error loading AOS', error); });
        }
    
        // Particles.js 로드 및 실행 (Shadow DOM 내의 요소 사용)
        if (!this.particlesInitialized) {
            loadScript(this, Particles + '/particles.js-master/particles.min.js')
                .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
                .then(() => {
                    // 템플릿 내의 particles 컨테이너 선택
                    const particlesDiv = this.template.querySelector('.particles-js');
                    if (!particlesDiv) {
                        console.error('particles container not found');
                        return;
                    }
                    // particlesJS 초기화에 필요한 id 부여
                    particlesDiv.id = 'particles-js';
                    
                    window.particlesJS('particles-js', {
                        particles: {
                            number: { value: 80, density: { enable: true, value_area: 800 } },
                            color: { value: "#FFA500" },
                            shape: { type: "circle", polygon: { nb_sides: 5 } },
                            opacity: { value: 0.5 },
                            size: { value: 3, random: true },
                            line_linked: { enable: true, distance: 150, color: "#FFA500", opacity: 0.6, width: 1 },
                            move: { enable: true, speed: 6 }
                        },
                        interactivity: {
                            detect_on: "canvas",
                            events: {
                                onhover: { enable: true, mode: "repulse" },
                                onclick: { enable: true, mode: "push" },
                                resize: true
                            }
                        },
                        retina_detect: true
                    });
                    this.particlesInitialized = true;
                })
                .catch(error => {
                    console.error('Error loading ParticlesJS', error);
                });
        }
    }

    handleSelectType(event) {
        const selectedType = event.target.getAttribute('data-type');
        if (selectedType) {
            this.userData.type = selectedType;
            // 수리/추가설치라면 날짜 선택 단계로, 아니면 바로 이메일 단계로 전환
            this.currentStep = this.shouldShowScheduledDate ? 2 : 3;
        }
    }

    handleEmailChange(event) {
        this.userData.email = event.target.value;
    }

    handleCheckEmail() {
        const email = this.userData.email;
        if (!email) {
            this.resultMessage = '이메일을 입력하세요.';
            return;
        }
        getAccountsByEmail({ email: email })
            .then(result => {
                if (result.length > 0) {
                    this.userData.accountId = result[0].Id;
                    this.resultMessage = '계정이 확인되었습니다.';
                    // 이메일 확인 후 다음 단계(추가 설명 입력)로 전환
                    this.currentStep = 4;
                } else {
                    this.resultMessage = '해당하는 Account가 없습니다.';
                }
            })
            .catch(error => {
                console.error('오류:', error);
                this.resultMessage = '계정 확인 중 오류가 발생했습니다.';
            });
    }

    handleScheduledDateChange(event) {
        this.userData.scheduledDate = event.target.value;
    }

    handleDescriptionChange(event) {
        this.userData.description = event.target.value;
    }

    // 날짜 선택 단계에서 "다음" 버튼 클릭 시
    nextStep() {
        this.currentStep += 1;
    }

    handleSubmit() {
        createCase({
            email: this.userData.email,
            type: this.userData.type,
            scheduledDate: this.userData.scheduledDate,
            description: this.userData.description,
            accountId: this.userData.accountId
        })
        .then(caseId => {
            this.resultMessage = `Case가 생성되었습니다! Case ID: ${caseId}`;
            setTimeout(() => {
                window.location.href = 'https://dreamorder-dev-ed.develop.my.site.com/s/';
            }, 2000);
        })
        .catch(error => {
            console.error('오류:', error);
            this.resultMessage = 'Case 생성 중 오류가 발생했습니다.';
        });
    }
}