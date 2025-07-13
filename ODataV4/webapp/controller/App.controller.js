sap.ui.define([
    "sap/ui/core/Messaging",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/json/JSONModel"
], function (Messaging, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

		onInit : function () {
            var oMessageModel = Messaging.getMessageModel(),
                oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
                    new Filter("technical", FilterOperator.EQ, true)),
                oViewModel = new JSONModel({
                    busy : false,
                    hasUIChanges : false,
                    usernameEmpty : true,
                    order : 0
                });

                this.getView().setModel(oViewModel, "appView");
                this.getView().setModel(oMessageModel, "message");

                oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
                this._bTechnicalErrors = false;
		},

        onCreate : function () {
            var oList = this.byId("peopleList"),
                oBinding = oList.getBinding("items"),
                oContext = oBinding.create({
                    "UserName" : "",
                    "FirstName" : "",
                    "LastName" : "",
                    "Age" : "18"
                });

            this._setUIChanges();
            this.getView().getModel("appView").setProperty("/usernameEmpty", true);

            oList.getItems().some(function (oItem) {
                if (oItem.getBindingContext() === oContext) {
                    oItem.focus();
                    oItem.setSelected(true);
                    return true;
                }
            });
        },

        onInputChange : function (oEvt) {
            if (oEvt.getParameter("escPressed")) {
                this._setUIChanges();
            } else {
                this._setUIChanges(true);
                if (oEvt.getSource().getParent().getBindingContext().getProperty("UserName")) {
                    this.getView().getModel("appView").setProperty("/usernameEmpty", false);
                }
            }
        },

        onButtonRefreshPress : function () {
            var oBinding = this.byId("PeopleTable").getBinding("items");

            if (oBinding.hasPendingChanges()) {
                MessageBox.error(this._getText("refreshNotPossibleMessage", []));
                return;
            }
            oBinding.refresh();
            MessageToast.show(this._getText("refreshSuccessMessage", []));
        },

        onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("SearchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			oView.byId("PeopleTable").getBinding("items").filter(oFilter, FilterType.Application);
		},

        onSave : function () {
            var fnSuccess = function () {
                this._setBusy(false);
                MessageToast.show(this._getText("changesSentMessage"));
                this._setUIChanges(false);
            }.bind(this);

            var fnError = function (oError) {
                this._setBusy(false);
                this._setUIChanges(false);
                MessageBox.error(oError.message);
            }.bind(this);

            this._setBusy(true);
            this.getView().getModel().submitBatch("peopleGroup").then(fnSuccess, fnError);
            this._bTechnicalErrors = false;
        },

		onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				sMessage,
				iOrder = oView.getModel("appView").getProperty("/order");

			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);
			oView.byId("PeopleTable").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));

			sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder], [])]);
			MessageToast.show(sMessage);
		},

        onMessageBindingChange : function (oEvent) {
            var aContexts = oEvent.getSource().getContexts(),
                aMessages,
                bMessageOpen = false;

            if (bMessageOpen || !aContexts.length) {
                return;
            }

            // Extract and remove the technical messages
            aMessages = aContexts.map(function (oContext) {
                return oContext.getObject();
            });
            sap.ui.getCore().getMessageManager().removeMessages(aMessages);

            this._setUIChanges(true);
            this._bTechnicalErrors = true;
            MessageBox.error(aMessages[0].message, {
                id : "serviceErrorMessageBox",
                onClose : function () {
                    bMessageOpen = false;
                }
            });

            bMessageOpen = true;
        },

        _getText : function (sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        },

        _setUIChanges : function (bHasUIChanges) {
            if (this._bTechnicalErrors) {
                bHasUIChanges = true;
            } else if (bHasUIChanges === undefined) {
                bHasUIChanges = this.getView().getModel().hasPendingChanges();
                oModel.setProperty("/hasUIChanges", bHasUIChanges);
            }
        },

        _setBusy : function (bIsBusy) {
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/busy", bIsBusy);
        }
	});
});
