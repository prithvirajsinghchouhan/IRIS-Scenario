import { LightningElement,track,wire } from 'lwc';
import { refreshApex } from "@salesforce/apex";
import { updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import fetchAccounts from '@salesforce/apex/AccountDetails.fetchAccounts';

const columns = [ { label: 'Account Name', fieldName: 'Name', sortable: "true",type:'text'},
    { label: 'Industry', fieldName: 'Industry', sortable: "true",type:'text'},
    { label: 'Annual Revenue', fieldName: 'AnnualRevenue', type: 'number', sortable: "true",editable: "true"}];

export default class IrisTask extends LightningElement {

    @track data;
    @track columns = columns;
    @track sortBy;
    @track sortDirection;
    @track initialRecords;
    @track wiredRecords;
    @track records = [];
    @track pageNumber = 1;
    @track pageSize = 10;
    @track totalRecords = 0;

    //this is used to fetch the accounts
    @wire(fetchAccounts)
    contacts(result) {
        if (result.data) {
            this.wiredRecords = result;
            this.records = result.data;
            this.initialRecords = result.data;
            this.totalRecords = result.data.length;
            this.pageSize = this.pageSize;
            this.paginationHelper();
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.data = undefined;
        }
    }

    // this function is used to handel pagination logic 
    paginationHelper() {
        this.data = [];
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        if (this.pageNumber <= 1) {
            this.pageNumber = 1;
        } else if (this.pageNumber >= this.totalPages) {
            this.pageNumber = this.totalPages;
        }
        for (let i = (this.pageNumber - 1) * this.pageSize; i < this.pageNumber * this.pageSize; i++) {
            if (i === this.totalRecords) {
                break;
            }
            this.data.push(this.records[i]);
        }
    }

    //this function is used to disable Previous button if user is on first page
    get bDisableFirst() {
        return this.pageNumber == 1;
    }

    //this function is used to disable Next button if user is on last page
    get bDisableLast() {
        return this.pageNumber == this.totalPages;
    }

    //this function is used to move on Previous page
    previousPage() {
        this.pageNumber = this.pageNumber - 1;
        this.paginationHelper();
    }

    //this function is used to move on Next page
    nextPage() {
        this.pageNumber = this.pageNumber + 1;
        this.paginationHelper();
    }

    //this function is invoked when user tries to sort on columns in table
    doSorting(event) {
        this.sortBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        this.sortData(this.sortBy, this.sortDirection);
    }

    //this is a generic function used to sort data based on field selected by user
    sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.records));

        let keyValue = (a) => {
            return a[fieldname];
        };

        let isText = this.isTextColumnType(fieldname);
        let isReverse = direction === 'asc' ? 1: -1;
        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; // handling null values
            y = keyValue(y) ? keyValue(y) : '';
            x = isText? x.toLowerCase() : x;
            y = isText? y.toLowerCase() : y;
            // sorting values based on direction
            return isReverse * ((x > y) - (y > x));
        });
        this.records = parseData;
        this.paginationHelper();
    }   

    //this function is to identify if column is of text type
    isTextColumnType(fieldname){
        for(let f of this.columns){
            if(f.fieldName === fieldname){
                return f.type === 'text';
            }
        }
        return false;
    }
    
    //this function is used to save the details after inline editing
    handleSave(event) {
        this.saveDraftValues = event.detail.draftValues;
        console.log('save Draft'+JSON.stringify(this.saveDraftValues));
        const recordInputs = this.saveDraftValues.slice().map(draft => {
            const fields = Object.assign({}, draft);
            return { fields };
        });
        const promises = recordInputs.map(recordInput => updateRecord(recordInput));
        Promise.all(promises).then(res => {
            this.ShowToast('Success', 'Records Updated Successfully!', 'success', 'dismissable');
            this.saveDraftValues = [];
            this.template.querySelector('lightning-input[data-name="searchField"]').value = '';
            return this.refresh();
        }).catch(error => {
            this.ShowToast('Error', 'An Error Occured!!', 'error', 'dismissable');
        }).finally(() => {
            this.saveDraftValues = [];
        });
    }

    //this function is used to search accounts based on Name field
    handleSearch(event) {
        const searchKey = event.target.value.toLowerCase();
 
        if (searchKey) {
            this.data = this.initialRecords;
 
            if (this.data) {
                let searchRecords = [];
 
                for (let record of this.data) {
                    let strVal = record.Name;
                    if (strVal) {
                        if (strVal.toLowerCase().includes(searchKey)) {
                            searchRecords.push(record);
                        }
                    }
                }
                this.records = searchRecords;
            }
        } else {
            this.records = this.initialRecords;
        }
        this.totalRecords = this.records.length;
        this.sortData(this.sortBy, this.sortDirection);
        this.paginationHelper();
    }

    //this function used for showing toast message to users
    ShowToast(title, message, variant, mode){
        const evt = new ShowToastEvent({
                title: title,
                message:message,
                variant: variant,
                mode: mode
            });
            this.dispatchEvent(evt);
    }

    // This function is used to refresh the table once data updated
    async refresh() {
        await refreshApex(this.wiredRecords);
    }
}