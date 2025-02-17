import { LightningElement, api } from 'lwc';

export default class HeroBackground extends LightningElement {
    @api title = 'Electra Series';
    @api slogan = 'Ride With Power';
    @api buttonText = 'See Electra Bikes';
    @api heroDetailsPosition = 'center';
    @api overlay = false; // Boolean 속성 기본값은 false
    @api opacity = 5;
    @api resourceUrl = 'https://kr.prd.image.homepage.torder.com/videos/1ae5ff84-2af2-4f07-80a9-866b0796787e.mp4';

    connectedCallback() {
        console.log('🚀 HeroBackground LWC Loaded');
        console.log('📌 resourceUrl:', this.resourceUrl);
        console.log('📌 overlay:', this.overlay);
        console.log('📌 opacity:', this.opacity);
        console.log('📌 heroDetailsPosition:', this.heroDetailsPosition);
    }

    get computedOverlay() {
        const overlayState = Boolean(this.overlay === true || this.overlay === 'true');
        console.log('✅ Computed Overlay:', overlayState);
        return overlayState;
    }

    get computedOverlayStyle() {
        const opacityValue = this.opacity ? Math.min(Math.max(parseInt(this.opacity, 10) / 10, 0), 1) : 0.5;
        console.log('✅ Computed Overlay Opacity:', opacityValue);
        return `opacity: ${opacityValue}`;
    }

    get computedHeroDetailsClass() {
        const className = this.heroDetailsPosition === 'left' ? 'hero-text-left' :
                          this.heroDetailsPosition === 'right' ? 'hero-text-right' :
                          'hero-text-center';
        console.log('✅ Computed Hero Details Class:', className);
        return className;
    }

    get computedVideoUrl() {
        console.log('🎬 Computed Video URL:', this.resourceUrl);
        return this.resourceUrl;
    }

    handleVideoError(event) {
        console.error('❌ 비디오 로드 오류:', event);
    }

    handleButtonClick() {
        const targetUrl = 'https://team5webtolead.netlify.app/';
        console.log('🔗 Button Click - Navigating to:', targetUrl);
        window.open(targetUrl, '_blank'); // 새 창에서 열기
    }
}