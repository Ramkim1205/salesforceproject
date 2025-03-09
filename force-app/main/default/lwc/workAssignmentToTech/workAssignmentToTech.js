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
                const localDateTime = new Date(work.Scheduled_Date__c);
                const formattedDate = localDateTime.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                return { ...work, isSelected: false, className: 'item-card work-card', formattedDate: formattedDate };
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
                let techs = result.map(techMap => {
                    let districts = techMap.Assigned_Districts__c;
                    if (districts) {
                        districts = districts.replace(/;/g, '\n');
                    }
                    let baseClass = 'item-card technician-card';
                    if (techMap.availability === '가능') {
                        baseClass += ' technician-available';
                    } else if (techMap.availability === '다른작업중') {
                        baseClass += ' unavailable-conflict';
                    } else if (techMap.availability === '근무시간 아님') {
                        baseClass += ' unavailable-hours';
                    }
                    let isAvailable = (techMap.availability === '가능');
                    return { 
                        ...techMap, 
                        Assigned_Districts__c: districts, 
                        isSelected: false, 
                        className: baseClass,
                        isAvailable: isAvailable
                    };
                });
                // 정렬: 가능한 기사들을 상단에, progress 값 오름차순
                techs.sort((a, b) => {
                    if (a.availability === '가능' && b.availability !== '가능') {
                        return -1;
                    } else if (a.availability !== '가능' && b.availability === '가능') {
                        return 1;
                    } else if (a.availability === '가능' && b.availability === '가능') {
                        return a.progress - b.progress;
                    } else {
                        return 0;
                    }
                });
                this.technicians = techs;
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

    // Technician 카드 클릭 (availability "가능"인 경우만 선택) - 단 하나만 선택되도록 수정
    handleTechnicianCardClick(event) {
        const techId = event.currentTarget.dataset.id;
        const clickedTech = this.technicians.find(tech => tech.technicianId === techId);
        if (clickedTech.availability !== '가능') {
            return;
        }
        this.technicians = this.technicians.map(tech => {
            if (tech.technicianId === techId) {
                return { ...tech, isSelected: true, className: tech.className.replace(' selected', '') + ' selected' };
            } else {
                return { ...tech, isSelected: false, className: tech.className.replace(' selected', '') };
            }
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