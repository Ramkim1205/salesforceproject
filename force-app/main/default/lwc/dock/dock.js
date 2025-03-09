import { LightningElement } from 'lwc';
import { NavigationMixin } from "lightning/navigation";

export default class Dock extends LightningElement {

salesApp ='';
servicesApp='';
marketingApp='';
salesConsoleApp='';
serviceConsoleApp='';
communityApp='';
OtherApp='';
codeBuiler='';

orgURL='https://dreamorder-dev-ed.develop.lightning.force.com/lightning/';

    sales(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + salesApp
            }
          });
         }


       services(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + servicesApp
            }
          });
       }  

       market(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + marketingApp
            }
          });
       }  

       salesConsole(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + salesConsoleApp
            }
          });
       }  

       
       serviceConsole(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + serviceConsoleApp
            }
          });
       }  

              
       community(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + communityApp
            }
          });
       }

       other(){
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: orgURL + OtherApp
            }
          });
       }

       
}