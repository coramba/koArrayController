var koArrayController = function (target) {
	var list = ko.observableArray([]);
	var generateUID = function() {
		function part() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
		return part() + part() + '-' + part() + '-' + part() + '-' + part() + '-' + part() + part() + part();
	};
	var UIDKeyName = '__ArrayControllerUniqueItemID';
	var CurrentAddons = {};

	ko.computed(function() {
		var UIDControlArray = [];
		var targetKOArray = this();
		var callbacksList = list();
		for (var ArrayItemIndex = 0; ArrayItemIndex < targetKOArray.length; ArrayItemIndex++) {
			var oneArrayItem = targetKOArray[ArrayItemIndex];

			if ( !oneArrayItem.hasOwnProperty(UIDKeyName) ) {
				oneArrayItem[UIDKeyName] = generateUID();
			}

			var ArrayItemUID = ko.toJS(oneArrayItem[UIDKeyName]);

			/** If UID already exists (i.e. oneArrayItem was copied) we need to generate new UID */
			if ( UIDControlArray.indexOf(ArrayItemUID) != -1 ) {
				oneArrayItem[UIDKeyName] = generateUID();
				ArrayItemUID = oneArrayItem[UIDKeyName];
			}
			UIDControlArray.push(ArrayItemUID);
			/** // */

			if (!CurrentAddons.hasOwnProperty(ArrayItemUID)) CurrentAddons[ArrayItemUID] = {};


			for ( var listInd = 0; listInd < callbacksList.length; listInd++ ) {
				var oneCallback = callbacksList[listInd];

				switch (oneCallback.type) {
					case 'runonce':
						if ( !CurrentAddons[ArrayItemUID].hasOwnProperty(oneCallback.name) || !CurrentAddons[ArrayItemUID][oneCallback.name] ) {
							oneCallback.function.call(oneArrayItem);
							CurrentAddons[ArrayItemUID][oneCallback.name] = true;
						}
						break;
					case 'computed':
						if ( !CurrentAddons[ArrayItemUID].hasOwnProperty(oneCallback.name) ) {
							CurrentAddons[ArrayItemUID][oneCallback.name] = ko.computed(oneCallback.function, oneArrayItem);
							CurrentAddons[ArrayItemUID][oneCallback.name].extend({throttle: 250});
						}
						break;
					case 'subscription':
						if ( !oneArrayItem.hasOwnProperty(oneCallback.property) || !ko.isObservable(oneArrayItem[oneCallback.property]) ) {
							throw 'Array item ['+ArrayItemIndex+'] has no property ['+oneCallback.property+']';
						}
						if ( !CurrentAddons[ArrayItemUID].hasOwnProperty(oneCallback.name) ) {
							CurrentAddons[ArrayItemUID][oneCallback.name] = oneArrayItem[oneCallback.property].subscribe(oneCallback.function.bind(oneArrayItem));
						}
						break;
				}
			}
		}
	},target);

	var validateParams = function(name, callback) {
		if ( !callback) {
			throw 'No callback provided';
		}

		if ( typeof callback != 'function') {
			throw 'Invalid callback - ' + (typeof callback);
		}

		var callbacksList = list();
		for (var listInd = 0; listInd < callbacksList.length; listInd++ ) {
			if (callbacksList[listInd]['name'] == name) {
				throw 'Name already in use';
			}
		}
	};

	return  {
		addArrayComputed: function(name, callback) {
			validateParams(name, callback);
			list.push({'name':name, type:'computed','function':callback})
		},
		addArraySubscription: function(name, propName, callback) {
			validateParams(name, callback);
			list.push({'name':name, type:'subscription', 'property':propName, 'function':callback})
		},
		addArrayRunOnce: function(name, callback) {
			validateParams(name, callback);
			list.push({'name':name, type:'runonce', 'function':callback})
		},
		removeByName: function(nameToRemove) {
			var targetList = target();
			for (var ind = 0; ind < targetList.length; ind++) {
				var oneArrayItem = targetList[ind];
				if (!oneArrayItem.hasOwnProperty(UIDKeyName)) continue;
				var uid = oneArrayItem[UIDKeyName];
				if ( CurrentAddons[uid].hasOwnProperty(nameToRemove)) {
					if ('function' == typeof CurrentAddons[uid][nameToRemove].dispose) {
						CurrentAddons[uid][nameToRemove].dispose();
					}

					delete CurrentAddons[uid][nameToRemove];
				}
			}

			var callbacksList = list();
			for (var listInd = 0; listInd < callbacksList.length; listInd++ ) {
				if ( callbacksList[listInd]['name'] == nameToRemove) {
					callbacksList.splice(listInd, 1);
				}
			}
		}
	};
};
