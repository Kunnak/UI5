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
], function (Messaging, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator,
    FilterType, JSONModel) {
    "use strict";

    return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

        /**
         *  Hook for initializing the controller
         */
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
            var oTable = this.byId("PeopleTable"),
                oBinding = oTable.getBinding("items"),
                oContext = oBinding.create({
                    "UserName" : "",
                    "FirstName" : "",
                    "LastName" : "",
                    "Age" : "18"
                });

            this._setUIChanges();
            this.getView().getModel("appView").setProperty("/usernameEmpty", true);

            oTable.getItems().some(function (oItem) {
                if (oItem.getBindingContext() === oContext) {
                    oItem.focus();
                    oItem.setSelected(true);
                    return true;
                }
            });
        },

        onDelete : function () {
            var oContext,
                oTable = this.byId("PeopleTable"),
                oSelected = oTable.getSelectedItem(),
                sUserName;
 
            if (oSelected) {
                oContext = oSelected.getBindingContext();
                sUserName = oContext.getProperty("UserName");
                
                console.log("1. Starting delete process for user:", sUserName);
                
                // Alle Auswahlen entfernen vor dem Löschen
                oTable.removeSelections(true);
                
                MessageToast.show(this._getText("deletionSuccessMessage", [sUserName]), {
                    duration: 3000,
                    width: "15em"
                });
                
                console.log("2. About to call oContext.delete()");
                
                var deletePromise = oContext.delete();
                console.log("3. Delete promise created:", deletePromise);
                
                deletePromise.then(function () {
                    console.log("4. DELETE SUCCESS CALLBACK - Promise resolved for user:", sUserName);
                    // Explizit das UI-Model aktualisieren nach der Löschung
                    this._setUIChanges(false);
                    
                }.bind(this), function (oError) {
                    console.log("5. DELETE ERROR CALLBACK - Promise rejected:", oError);
                    this._setUIChanges();
                    if (oError.canceled) {
                        MessageToast.show(this._getText("deletionRestoredMessage", [sUserName]), {
                            duration: 3000,
                            width: "15em"
                        });
                        return;
                    }
                    MessageBox.error(oError.message + ": " + sUserName);
                }.bind(this));
                
                console.log("6. Delete promise setup complete, continuing with UI changes");
                this._setUIChanges(true);
                
            } else {
                console.log("No item selected for deletion");
                MessageToast.show("Please select a user to delete", {
                    duration: 3000,
                    width: "15em"
                });
            }
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

        onResetChanges : function () {
            this.byId("PeopleTable").getBinding("items").resetChanges();
            this._bTechnicalErrors = false; 
            this._setUIChanges();
        },

        onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("SearchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			oView.byId("PeopleTable").getBinding("items").filter(oFilter, FilterType.Application);
		},

        onResetDataSource : function () {
            var oModel = this.getView().getModel(),
                oBinding = this.byId("PeopleTable").getBinding("items"),
                oTable = this.byId("PeopleTable");

            oTable.removeSelections(true);

            if (oBinding.hasPendingChanges()) {
                console.log("Pending changes detected, resetting them first");
                oBinding.resetChanges();
            }

            setTimeout(function() {
                var oOperation = oModel.bindContext("/ResetDataSource(...)");
                
                oOperation.invoke().then(function () {
                        oModel.refresh();
                        MessageToast.show(this._getText("sourceResetSuccessMessage"), {
                            duration: 3000,
                            width: "15em"
                        });
                        
                        console.log("Reset completed - no items selected");
                        
                    }.bind(this), function (oError) {
                        MessageBox.error(oError.message);
                    }
                );
            }.bind(this), 300);
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
            
        onSelectionChange : function (oEvent) {
            this._setDetailArea(oEvent.getParameter("listItem").getBindingContext());
        },

        _getText : function (sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        },

        _setBusy : function (bBusy) {
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/busy", bBusy);
        },

        _setUIChanges : function (bHasUIChanges) {
            if (this._bTechnicalErrors) {
                
                bHasUIChanges = true;
            } else if (bHasUIChanges === undefined) {
                bHasUIChanges = this.getView().getModel().hasPendingChanges();
            }
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/hasUIChanges", bHasUIChanges);
        },
    

        /**
         * Toggles the visibility of the detail area
         *
         * @param {object} [oUserContext] - the current user context
         */
        _setDetailArea : function (oUserContext) {
            var oDetailArea = this.byId("detailArea"),
                oLayout = this.byId("defaultLayout"),
                oSearchField = this.byId("searchField");
 
            oDetailArea.setBindingContext(oUserContext || null);
            // resize viewcontroller
            oDetailArea.setVisible(!!oUserContext);
            oLayout.setSize(oUserContext ? "60%" : "100%");
            oLayout.setResizable(!!oUserContext);
            oSearchField.setWidth(oUserContext ? "40%" : "20%");
        }

	});
});
