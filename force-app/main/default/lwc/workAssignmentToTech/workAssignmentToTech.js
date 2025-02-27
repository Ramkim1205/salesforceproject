import { LightningElement, track, wire } from 'lwc';
import getWorksWaitingAssignment from '@salesforce/apex/WorkAssignmentController.getWorksWaitingAssignment';
import getTechniciansByWorkDistrictAll from '@salesforce/apex/WorkAssignmentController.getTechniciansByWorkDistrictAll_NoWrapper';
import assignWorkToTechnician from '@salesforce/apex/WorkAssignmentController.assignWorkToTechnician';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class WorkAssignmentToTech extends LightningElement {
    @track works = [];
    @track error;
    @track technicians = [];
    @track selectedWork;       // 선택된 Work 객체
    @track selectedTechnician; // 선택된 Technician 객체

    wiredWorksResult;

    @wire(getWorksWaitingAssignment)
    wiredWorks(result) {
        this.wiredWorksResult = result;
        if (result.data) {
            this.works = result.data.map(work => {
                return { ...work, isSelected: false, className: 'item-card work-card' };
            });
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body ? result.error.body.message : result.error;
            this.works = [];
        }
    }

    // Work 카드 클릭: 선택한 Work 기준으로 기술자 목록 조회
    handleWorkCardClick(event) {
        const workId = event.currentTarget.dataset.id;
        this.works = this.works.map(work => {
            if (work.Id === workId) {
                work.isSelected = true;
                work.className = 'item-card work-card selected';
            } else {
                work.isSelected = false;
                work.className = 'item-card work-card';
            }
            return work;
        });
        this.selectedWork = this.works.find(work => work.Id === workId);
        console.log('선택된 Work:', this.selectedWork);
        getTechniciansByWorkDistrictAll({ workId: workId })
            .then(result => {
                // 각 기술자 Map에 대해, availability에 따라 CSS 클래스를 설정하고 photoUrl 포함
                this.technicians = result.map(techMap => {
                    let baseClass = 'item-card technician-card';
                    if (techMap.availability === '가능') {
                        baseClass += ' technician-available';
                    } else if (techMap.availability === '다른작업중') {
                        baseClass += ' unavailable-conflict';
                    } else if (techMap.availability === '근무시간 아님') {
                        baseClass += ' unavailable-hours';
                    }
                    return { ...techMap, isSelected: false, className: baseClass };
                });
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : error,
                    variant: 'error'
                }));
                this.technicians = [];
            });
        this.selectedTechnician = undefined;
    }

    // Technician 카드 클릭 (availability "가능"인 경우만 선택)
    handleTechnicianCardClick(event) {
        const techId = event.currentTarget.dataset.id;
        const clickedTech = this.technicians.find(tech => tech.technicianId === techId);
        if (clickedTech.availability !== '가능') {
            return;
        }
        this.technicians = this.technicians.map(tech => {
            if (tech.technicianId === techId) {
                tech.isSelected = true;
                tech.className = tech.className + ' selected';
            } else {
                tech.isSelected = false;
                tech.className = tech.className.replace(' selected', '');
            }
            return tech;
        });
        this.selectedTechnician = this.technicians.find(tech => tech.technicianId === techId);
        console.log('선택된 Technician:', this.selectedTechnician);
    }

    // 배정 버튼 클릭 시, 선택된 Work와 기술자에 대해 할당 처리
    handleAssign() {
        if (!this.selectedWork || !this.selectedTechnician) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '작업과 기사를 모두 선택하세요.',
                variant: 'error'
            }));
            return;
        }
        assignWorkToTechnician({ workId: this.selectedWork.Id, technicianId: this.selectedTechnician.technicianId })
            .then(result => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: result,
                    variant: 'success'
                }));
                return refreshApex(this.wiredWorksResult);
            })
            .then(() => {
                this.selectedWork = undefined;
                this.technicians = [];
                this.selectedTechnician = undefined;
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : error,
                    variant: 'error'
                }));
            });
    }
}