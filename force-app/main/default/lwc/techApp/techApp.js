import { LightningElement, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import { NavigationMixin } from 'lightning/navigation';
import LEAFLET_ZIP from '@salesforce/resourceUrl/LeafletJS';
import LEAFLET_ROUTING_ZIP from '@salesforce/resourceUrl/LEAFLET_ROUTING_ZIP';
import getWorksForDate from '@salesforce/apex/TechnicianWorkController.getWorksForDate';

export default class TechApp extends NavigationMixin(LightningElement) {
    @track works;
    @track selectedDate;
    leafletInitialized = false;
    map;
    markers = [];
    routeControl; // 경로 컨트롤 저장용
    userLat;
    userLng;
    locationFetched = false; // 사용자 위치가 세팅되었는지 여부

    connectedCallback() {
        // 오늘 날짜를 ISO 형식(yyyy-mm-dd)으로 구해서 기본값으로 설정
        const todayStr = new Date().toISOString().slice(0, 10);
        this.selectedDate = todayStr;
    }

    renderedCallback() {
        if (this.leafletInitialized) {
            return;
        }
        this.leafletInitialized = true;
        Promise.all([
            // Leaflet 라이브러리 로드
            loadStyle(this, LEAFLET_ZIP + '/leaflet.css'),
            loadScript(this, LEAFLET_ZIP + '/leaflet.js'),
            // Leaflet Routing Machine 로드 (dist 폴더 내부 파일)
            loadStyle(this, LEAFLET_ROUTING_ZIP + '/leaflet-routing-machine-3.2.12/dist/leaflet-routing-machine.css'),
            loadScript(this, LEAFLET_ROUTING_ZIP + '/leaflet-routing-machine-3.2.12/dist/leaflet-routing-machine.js')
        ])
            .then(() => {
                this.initializeMap();
                this.getUserLocation();
                // 지도 초기화 후 기본 날짜(오늘)로 데이터를 조회
                if (this.selectedDate) {
                    this.handleDateChange({ target: { value: this.selectedDate } });
                }
            })
            .catch(error => {
                console.error('Error loading Leaflet or Routing Machine:', error);
            });
    }

    initializeMap() {
        const mapContainer = this.template.querySelector('.map-container');
        // 기본 좌표: 서울 (이후 사용자 위치 가져온 뒤 재설정됨)
        this.map = L.map(mapContainer).setView([37.5665, 126.9780], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data © OpenStreetMap contributors'
        }).addTo(this.map);
    }

    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLat = position.coords.latitude;
                    this.userLng = position.coords.longitude;
                    // 지도 중심을 사용자 위치로 변경
                    this.map.setView([this.userLat, this.userLng], 12);
                    const userIcon = L.icon({
                        iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    });
                    L.marker([this.userLat, this.userLng], { icon: userIcon }).addTo(this.map);
                    // 위치가 성공적으로 가져와졌음을 표시
                    this.locationFetched = true;
                    // 만약 이미 작업(works)이 있다면 경로 다시 그림
                    if (this.works && this.works.length > 0) {
                        this.drawRoute();
                    }
                },
                (error) => {
                    console.error('Error getting user location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }

    handleDateChange(event) {
        this.selectedDate = event.target.value;
        if (this.selectedDate) {
            getWorksForDate({ selectedDate: this.selectedDate })
                .then(result => {
                    let worksWithDate = result.map(work => {
                        let newWork = { ...work };
                        newWork.formattedDate = work.Scheduled_Date__c 
                            ? new Date(work.Scheduled_Date__c).toLocaleString() 
                            : '';
                        return newWork;
                    });
                    this.works = worksWithDate;
                    this.updateMapMarkers();
                    this.drawRoute();
                })
                .catch(error => {
                    console.error('Error fetching works:', error);
                });
        }
    }

    updateMapMarkers() {
        // 기존 마커 제거
        if (this.markers.length > 0) {
            this.markers.forEach(marker => marker.remove());
            this.markers = [];
        }
        if (this.works) {
            this.works.forEach(work => {
                if (work.Latitude__c && work.Longitude__c) {
                    let marker = L.marker([work.Latitude__c, work.Longitude__c])
                        .addTo(this.map)
                        .bindPopup(`<b>${work.Name}</b><br>구: ${work.District__c}`);
                    this.markers.push(marker);
                }
            });
        }
    }

    drawRoute() {
        // 만약 아직 위치를 가져오지 않았다면 1초 후 다시 시도
        if (!this.locationFetched) {
            console.log('사용자 위치를 아직 가져오지 못했습니다. 1초 후 다시 시도합니다.');
            setTimeout(() => { this.drawRoute(); }, 1000);
            return;
        }
        // 기존 경로 컨트롤 제거
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
            this.routeControl = null;
        }
        if (!this.userLat || !this.userLng) {
            console.log('사용자 위치가 없습니다.');
            return;
        }
        if (!this.works || this.works.length === 0) {
            console.log('할당된 작업이 없습니다.');
            return;
        }
        // 가장 위에 있는 work (첫 번째 work)를 사용
        let firstWork = this.works[0];
        if (!firstWork.Latitude__c || !firstWork.Longitude__c) {
            console.log('첫 번째 작업에 위치 정보가 없습니다.');
            return;
        }
        // Leaflet Routing Machine 사용: 시작점은 사용자 위치(빨간 마커), 도착점은 첫 번째 작업
        this.routeControl = L.Routing.control({
            waypoints: [
                L.latLng(this.userLat, this.userLng),
                L.latLng(firstWork.Latitude__c, firstWork.Longitude__c)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            collapsible: true,
            createMarker: (i, wp, n) => {
                if (i === 0) {
                    // 시작 지점: 빨간 마커 아이콘
                    return L.marker(wp.latLng, {
                        icon: L.icon({
                            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            iconSize: [32, 32],
                            iconAnchor: [16, 32]
                        })
                    });
                }
                return L.marker(wp.latLng);
            }
        }).addTo(this.map);
    }

    openKakaoMapFirstWork() {
        if (!this.userLat || !this.userLng) {
            console.error('사용자 위치가 없습니다.');
            return;
        }
        if (!this.works || this.works.length === 0) {
            console.error('작업이 없습니다.');
            return;
        }
        const firstWork = this.works[0];
        if (!firstWork.Latitude__c || !firstWork.Longitude__c) {
            console.error('첫 번째 작업에 위치 정보가 없습니다.');
            return;
        }
        const url = `https://map.kakao.com/link/from/내위치,${this.userLat},${this.userLng}/to/${firstWork.Name},${firstWork.Latitude__c},${firstWork.Longitude__c}`;
        window.open(url, '_blank');
    }

    handleViewDetail(event) {
        const workId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: workId,
                objectApiName: 'Work__c',
                actionName: 'view'
            }
        });
    }

    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        return new Date(dateTimeStr).toLocaleString();
    }
}