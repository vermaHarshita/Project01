/**
 * Created by user1 on 3/3/2017.
 */

import {Router, Request, Response, NextFunction} from 'express';
var _ = require('underscore');

// var logger=require('./logger');
import * as organisationHierarchy from './organisation'
import {getResponse,postResponse,putResponse,deleteResponse,duplicateResponse} from "../../share/response.model";
import forEach = ts.forEach;
const util = require('util');
import * as user from '../user/user';


/**
 * Created by root on 2/3/17.
 */

export class SubscriberRoute {
    router:Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    init() {

        this.router.get('/', (req, res)=>this.getSubscriber(req, res));
        this.router.get('/orglist', (req, res)=>this.getOrganizationList(req, res));
        this.router.get('/gstin', (req, res)=>this.getOrganizationGSTINList(req, res));
        this.router.post('/', (req, res)=>this.saveOrganisation(req, res));
        this.router.put('/', (req, res)=>this.updateOrganisation(req, res));

        this.router.put('/root', (req, res)=>this.makeRootOrganisation(req, res));

        this.router.delete('/:id', (req, res)=>this.deleteOrganisation(req, res));
    }

    getSubscriber(req, res) {

        /*req.body.userId=decoded.userId;
         req.body.orgId=decoded.orgId;*/
        //let query={isDelete:"0",userId:req.body.userId,orgId:req.body.orgId};
        let query = {isDelete: "0", subscriberId: req.body.subscriberId};
        let self = this;
        organisationHierarchy.find(query, (err, organisation) => {
            if (err) {
                res.send(new getResponse(false, err, []));
            }
            else {
                console.log(req.body.subscriberId);
                //let result=self.getNestedChildren(JSON.parse(JSON.stringify(organisation)),req.body.orgId);
                res.send(new getResponse(true, null, organisation));
            }
        });
    }

    saveOrganisation(req, res) {
        var request = req.body.data;
        request.sub
        var organizationData = new organisationHierarchy(req.body.data);
        organizationData.subscriberId = req.body.subscriberId;
        organizationData.userId = req.body.userId;


        organizationData.save((err) => {
            if (err) {
                res.send(new postResponse(false, err, []))
            }
            else {
                console.log("organization saved successfully..", organizationData);
                res.send(new postResponse(true, null, organizationData));
            }
        });
    }

    updateOrganisation(req, res) {
        var organizationData = req.body.data;
        organizationData.subscriberId = req.body.subscriberId;
        organizationData.userId = req.body.userId;
        //console.log(req.body.businessDetails);

        organisationHierarchy.findOneAndUpdate({_id: req.body.data._id}, organizationData, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }, function (err, doc) {
            if (err)
                res.send(new putResponse(false, err, []));
            else
                res.send(new putResponse(true, null, doc));
        });
    }

    deleteOrganisation(req, res) {

        organisationHierarchy.findById(req.params.id, function (err, data) {
            if (err) {
                res.send(new deleteResponse(false, err, []));
            }
            else {
                organisationHierarchy.find({parentOrg: req.params.id, isDelete: "0"}, function (err, childdata) {
                    if (!err) {
                        if (childdata.length <= 0) {
                            data.isDelete = 1;
                            data.save(function (err, data) {
                                if (err) {
                                    res.send(new deleteResponse(false, err, []));

                                }
                                else {
                                    res.send(new deleteResponse(true, null, data));

                                }
                            })
                        }
                        else {
                            res.send(new deleteResponse(false, null, data, "First deleteHsn it's child organisation"));
                        }

                    }
                    else {
                        res.send(new deleteResponse(false, err, []));
                    }

                });


            }

        })
    }

    getOrganizationList(req, res) {
        let query = {isDelete: "0", parentOrg: '', subscriberId: req.body.subscriberId};
        let self = this;

    }

    makeRootOrganisation(req, res) {
        //let query={isDelete:"0",parentOrg:req.body.userId,userId:req.body.userId,orgId:req.body.orgId};
        let rootOrg;

        organisationHierarchy.findById(req.body.parentOrg, (err, org) => {
            if (err) {
                res.send(new putResponse(false, err, org));

            }
            else {
                rootOrg = org.parentOrg;
                org.parentOrg = "0";
                org.subscriberId = org._id;
                org.save(function (err, dd) {
                    if (err) {
                        //console.log("hello");
                        res.send(new putResponse(false, err, []));

                    }
                    else {
                        organisationHierarchy.updateHsn({parentOrg: req.body.parentOrg}, {
                                parentOrg: rootOrg,
                                subscriberId: rootOrg
                            },
                            {multi: true},
                            function (err, updateorg) {
                                if (err) {
                                    res.send(new putResponse(true, null, updateorg));
                                }
                                else {

                                    organisationHierarchy.findById(req.body.subscriberId, (err, data) => {
                                        if (err) {
                                            res.send(new getResponse(false, err, []));
                                        }
                                        else {
                                            data.parentOrg = req.body.parentOrg;
                                            data.subscriberId = req.body.parentOrg;
                                            data.save(function (err, data) {
                                                if (err) {
                                                    res.send(new putResponse(false, err, []));
                                                    console.log("ritesh err");

                                                }
                                                else {
                                                    res.send(new putResponse(true, null, []));
                                                }
                                            });
                                        }
                                    });
                                    //res.send(new putResponse(true, null, dd));

                                }
                            });
                    }

                });

            }
        })

    }

    recurseAndAdd(el, descendants, res) {
        let self = this;
        descendants.push({id: el, children: ''});
        organisationHierarchy.find({parentOrg: el}, (err, desc) => {
            if (err) {
                console.log("error");
            }
            else {

                let temp = JSON.parse(JSON.stringify(desc));
                if (temp.length > 0) {
                    descendants[descendants.length - 1].children = temp;
                    for (let i = 0; i < temp.length; i++) {
                        self.recurseAndAdd(temp[i]._id, descendants, res);
                    }
                }
                res.send(new getResponse(true, '', descendants));

            }
        });

        /* let self = this;
         var out = [];

         for(var i in arr) {
         if(arr[i].parent == parent) {
         var children = getNestedChildren(arr, arr[i].id)

         if(children.length) {
         arr[i].children = children
         }
         out.push(arr[i])
         }
         }
         return out*/

    }

    getNestedChildren(arr, parent) {
        var out = [];
        for (var i in arr) {

            if (arr[i].subscriberId == parent)
                out.push(arr[i]);

            if (arr[i].parentOrg == parent) {
                console.log("array");
                out.push(arr[i]);
                var children = this.getNestedChildren(arr, arr[i]._id);
                console.log(children);

                if (children.length) {
                    children.forEach(d=> {
                        out.push(d);

                    });
                    //arr[i].children = children
                }
            }
        }
        return out;


    }


    getOrganizationGSTINList(req, res) {
        let sqlquery = {};
        let self = this;

        if (!req.body.userId || util.isNullOrUndefined(req.body.userId) || req.body.userId == "" || !req.body.subscriberId || util.isNullOrUndefined(req.body.subscriberId) || req.body.subscriberId == "") {
            res.send(new getResponse(false, null, []));
        }
        else {
            var query = user.findOne({_id: req.body.userId, subscriberId: req.body.subscriberId});
            query.exec(function (err, userData) {
                if (err) {
                    res.send(new getResponse(false, null, []));
                }
                else {
                    if (userData) {
                        console.log("record found");
                        var accessParams = userData.accessParams;
                        var userType = userData.userType;
                        if (userType == 'admin-sme' || userType == 'admin-ca' || userType == 'admin-bu') {
                            console.log("Admin User Type");
                            //sqlquery={isDelete:"0", subscriberId:req.body.subscriberId};
                            console.log(accessParams);
                            sqlquery = {isDelete: "0", subscriberId: req.body.subscriberId};
                            organisationHierarchy.find(sqlquery, (err, org) => {
                                if (err) {
                                    res.send(new getResponse(false, err, []));
                                }
                                else {
                                    res.send(new getResponse(true, null, org));
                                }

                            });

                        } else {
                            console.log("Not Admin User Type");
                            console.log(accessParams);
                            sqlquery = {isDelete: "0", 'gstin': {$in: accessParams}};
                            organisationHierarchy.find(sqlquery, (err, org) => {
                                if (err) {
                                    res.send(new getResponse(false, err, []));
                                }
                                else {
                                    res.send(new getResponse(true, null, org));
                                }

                            });
                        }
                    }
                    else {
                        res.send(new getResponse(false, null, []));
                    }
                }
            });
        }


    }


}
const subscriberRouter = new SubscriberRoute();

subscriberRouter.init();

export default subscriberRouter.router;
