sap.ui.define([
	"sap/ui/demo/nav/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("sap.ui.demo.nav.controller.NotFound", {
		onInit: function () {
			var oRouter, oTarget;

			oRouter = this.getRouter();
			oTarget = oRouter.getTarget("notFound");
			oTarget.attachDisplay(function (oEvent) {
				this._oData = oEvent.getParameter("data");	// store the data
			}, this);
		},

		onNavBack : function () {
			if (this._oData && this._oData.fromTarget) {
				this.getRouter().getTargets().display(this._oData.fromTarget);
				delete this._oData.fromTarget;
				return;
			}
			BaseController.prototype.onNavBack.apply(this, arguments);
		}
	});
});
