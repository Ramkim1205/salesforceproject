import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import getLeadLocations from '@salesforce/apex/LeadLocationController.getLeadLocations';
import getInstalledStoreLocations from '@salesforce/apex/LeadLocationController.getInstalledStoreLocations';
import LEAFLET_ZIP from '@salesforce/resourceUrl/LeafletJS';
// GeoJSON 파일을 static resource로 업로드한 후 아래와 같이 import
import GEOJSON_DISTRICTS from '@salesforce/resourceUrl/seouldistricts';

export default class LeadMapHome extends LightningElement {
    @track leads = [];
    @track installedStores = [];
    @track selectedFilters = []; // 선택된 필터 문자열 배열
    map;
    isLeafletLoaded = false;
    markers = [];

    // wire로 리드 데이터 불러오기
    @wire(getLeadLocations)
    wiredLeads({ error, data }) {
        if (data) {
            this.leads = data;
            console.log('✅ 가져온 리드 데이터:', this.leads);
            // 필터가 선택되어 있을 때만 마커 추가 (초기 로딩 시에는 아무 마커도 찍지 않음)
            if (this.isLeafletLoaded && this.map && this.selectedFilters.length > 0) {
                this.addMarkers();
            }
        } else if (error) {
            console.error('❌ 리드 데이터 로드 실패:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '리드 데이터를 불러올 수 없습니다.',
                variant: 'error'
            }));
        }
    }

    // 설치된 매장 데이터는 "설치된 매장" 필터가 선택될 때 로드
    loadInstalledStores() {
        getInstalledStoreLocations()
            .then(result => {
                this.installedStores = result;
                console.log('✅ 설치된 매장 데이터:', this.installedStores);
                this.addMarkers();
            })
            .catch(error => {
                console.error('❌ 설치된 매장 데이터 로드 실패:', error);
            });
    }

    renderedCallback() {
        if (this.isLeafletLoaded) return;
        Promise.all([
            loadStyle(this, LEAFLET_ZIP + '/leaflet.css'),
            loadScript(this, LEAFLET_ZIP + '/leaflet.js')
        ])
        .then(() => {
            console.log('✅ Leaflet.js 로드 성공');
            if (!window.L) {
                console.error('❌ Leaflet.js가 로드되었지만 L 객체가 없습니다.');
                return;
            }
            this.isLeafletLoaded = true;
            this.initMap();
        })
        .catch(error => {
            console.error('❌ Leaflet.js 로드 실패:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '지도 라이브러리를 불러올 수 없습니다.',
                variant: 'error'
            }));
        });
    }

    initMap() {
        console.log('✅ 지도 초기화 시작');
        const mapContainer = this.template.querySelector('.map-container');
        if (!mapContainer) {
            console.error('❌ 지도 컨테이너를 찾을 수 없습니다.');
            return;
        }
        if (!window.L) {
            console.error('❌ Leaflet이 아직 로드되지 않았습니다.');
            return;
        }
        this.map = L.map(mapContainer).setView([37.5665, 126.9780], 12);
        // CartoDB Positron 타일 레이어 (회색 톤)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(this.map);
        console.log('✅ 지도 생성 완료');
        setTimeout(() => { this.map.invalidateSize(); }, 500);

        // GeoJSON 경계 레이어 추가
        this.loadDistrictBoundaries();
        // 초기 로딩 시 필터 미선택 상태 -> 마커 추가하지 않음
    }

    loadDistrictBoundaries() {
        // static resource에 저장한 GeoJSON 파일 URL을 사용하여 fetch() 호출
        fetch(GEOJSON_DISTRICTS)
            .then(response => response.json())
            .then(geojsonData => {
                // 경계 스타일 옵션 설정 (원하는 색상, 선 굵기 등)
                const boundaryStyle = {
                    color: 'Orange',
                    weight: 2,
                    fillOpacity: 0
                };
                // GeoJSON 레이어 추가
                L.geoJson(geojsonData, {
                    style: boundaryStyle,
                    onEachFeature: (feature, layer) => {
                        // 각 구의 이름이 담긴 속성(예: SIG_ENG_NM)을 툴팁으로 항상 표시
                        if (feature.properties && feature.properties.SIG_KOR_NM) {
                            layer.bindTooltip(feature.properties.SIG_KOR_NM, {
                                permanent: true,
                                direction: 'center',
                                className: 'district-label'
                            });
                        }
                    }
                }).addTo(this.map);
                console.log('✅ 구 경계 GeoJSON 레이어 추가 완료');
            })
            .catch(error => {
                console.error('❌ GeoJSON 경계 로드 실패:', error);
            });
    }

    toggleFilter(event) {
        const filter = event.target.dataset.filter;
        if (this.selectedFilters.includes(filter)) {
            this.selectedFilters = this.selectedFilters.filter(f => f !== filter);
            event.target.classList.remove('selected');
        } else {
            this.selectedFilters.push(filter);
            event.target.classList.add('selected');
        }
        console.log('Selected Filters:', this.selectedFilters);
        // "설치된 매장" 필터가 선택된 경우 설치 매장 데이터를 로드
        if (this.selectedFilters.includes('설치된 매장')) {
            this.loadInstalledStores();
        }
        this.addMarkers();
    }

    addMarkers() {
        if (!this.map) {
            console.error('❌ 지도 객체가 초기화되지 않았습니다.');
            return;
        }
        // 선택된 필터가 없으면 마커 제거 후 반환
        if (this.selectedFilters.length === 0) {
            if (this.markers && this.markers.length > 0) {
                this.markers.forEach(marker => marker.remove());
            }
            this.markers = [];
            return;
        }
        
        // 기존 마커 제거
        if (this.markers && this.markers.length > 0) {
            this.markers.forEach(marker => marker.remove());
        }
        this.markers = [];
        
        // 아이콘 URL 매핑 (타사제품이용 이미지는 구글 레드닷으로 변경)
        const iconUrls = {
            '타사제품이용': 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            '우선순위 낮음': 'https://dreamorder-dev-ed.develop.lightning.force.com/img/samples/flag_yellow.gif',
            '우선순위 중간': 'https://dreamorder-dev-ed.develop.lightning.force.com/img/samples/flag_red.gif',
            '우선순위 높음': 'https://dreamorder-dev-ed.develop.lightning.force.com/img/samples/flag_green.gif'
        };

        // 리드 마커 추가 (선택된 필터 조건에 맞는 리드)
        this.leads.forEach(lead => {
            const lat = parseFloat(lead.Latitude__c);
            const lng = parseFloat(lead.Longitude__c);
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ 잘못된 좌표 - ${lead.Name}: (${lead.Latitude__c}, ${lead.Longitude__c})`);
                return;
            }
            let shouldAdd = false;
            let chosenIcon = null;
            if (this.selectedFilters.length > 0) {
                if (this.selectedFilters.includes('타사제품이용') && lead.TableOrder__c === true) {
                    shouldAdd = true;
                    chosenIcon = iconUrls['타사제품이용'];
                }
                if (this.selectedFilters.includes('우선순위 낮음') && lead.Primary__c === 'Cold') {
                    shouldAdd = true;
                    chosenIcon = iconUrls['우선순위 낮음'];
                }
                if (this.selectedFilters.includes('우선순위 중간') && lead.Primary__c === 'Warm') {
                    shouldAdd = true;
                    chosenIcon = iconUrls['우선순위 중간'];
                }
                if (this.selectedFilters.includes('우선순위 높음') && lead.Primary__c === 'Hot') {
                    shouldAdd = true;
                    chosenIcon = iconUrls['우선순위 높음'];
                }
            } else {
                shouldAdd = true;
                chosenIcon = this.extractImageUrl(lead.Flag__c) || 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            }
            if (shouldAdd && chosenIcon) {
                // 기본 아이콘 크기
                let iconSize = [32, 32];
                // 우선순위 필터 적용 시 크기를 60%로 줄임 (약 19×19)
                if ((this.selectedFilters.includes('우선순위 낮음') && lead.Primary__c === 'Cold') ||
                    (this.selectedFilters.includes('우선순위 중간') && lead.Primary__c === 'Warm') ||
                    (this.selectedFilters.includes('우선순위 높음') && lead.Primary__c === 'Hot')) {
                    iconSize = [Math.round(32 * 0.6), Math.round(32 * 0.6)]; // [19, 19]
                }
                let customIcon = L.icon({
                    iconUrl: chosenIcon,
                    iconSize: iconSize,
                    iconAnchor: [Math.round(iconSize[0] / 2), iconSize[1]],
                    popupAnchor: [0, -iconSize[1]]
                });
                const detailUrl = 'https://dreamorder-dev-ed.develop.lightning.force.com/lightning/r/Lead/' + lead.Id + '/view';
                let marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
                    .bindPopup(`<b>${lead.Name}</b><br>${lead.Address__c}<br>
                        <a href="${detailUrl}" target="_self" class="popup-btn">상세보기</a>`);
                this.markers.push(marker);
                console.log(`✅ 리드 마커 추가: ${lead.Name} (${lat}, ${lng})`);
            }
        });

        // 설치된 매장 마커 추가 (설치된 매장 필터가 선택된 경우)
        if (this.selectedFilters.includes('설치된 매장')) {
            // 파란색 기본 아이콘 사용
            let blueIcon = L.icon({
                iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });
            this.installedStores.forEach(work => {
                const lat = parseFloat(work.Latitude__c);
                const lng = parseFloat(work.Longitude__c);
                if (isNaN(lat) || isNaN(lng)) return;
                let marker = L.marker([lat, lng], { icon: blueIcon }).addTo(this.map)
                    .bindPopup(`<b>${work.Name}</b><br>${work.Address__c}`);
                this.markers.push(marker);
                console.log(`✅ 설치된 매장 마커 추가: ${work.Name} (${lat}, ${lng})`);
            });
        }
    }

    // Flag__c (IMAGE formula) HTML 문자열에서 src 값을 추출하는 헬퍼 메서드
    extractImageUrl(htmlString) {
        if (!htmlString) return null;
        const regex = /src\s*=\s*["']([^"']+)["']/i;
        const match = regex.exec(htmlString);
        return match && match[1] ? match[1] : null;
    }
}