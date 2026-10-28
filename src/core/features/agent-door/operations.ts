export default [
  {
    "name": "mango.campaigns.list",
    "title": "Campaigns list",
    "method": "GET",
    "path": "/api/campaigns",
    "inputSchema": {
      "type": "object",
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "draft",
            "scheduled",
            "dispatching",
            "paused",
            "completed",
            "cancelled"
          ]
        },
        "channel": {
          "type": "string",
          "enum": [
            "email",
            "sms"
          ]
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-001"
    ],
    "kind": "campaigns.list",
    "query": true
  },
  {
    "name": "mango.campaigns.read",
    "title": "Campaigns read",
    "method": "GET",
    "path": "/api/campaigns/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-001"
    ],
    "kind": "campaigns.read"
  },
  {
    "name": "mango.campaigns.create",
    "title": "Campaigns create",
    "method": "POST",
    "path": "/api/campaigns",
    "inputSchema": {
      "type": "object",
      "properties": {
        "composition": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 160
            },
            "designTemplateKey": {
              "type": "string",
              "format": "uuid",
              "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
            },
            "audienceRule": {
              "type": "string",
              "maxLength": 4000
            },
            "emailSubject": {
              "type": "string",
              "maxLength": 250
            },
            "emailBody": {
              "type": "string"
            },
            "emailMobile": {
              "maxItems": 128,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "block": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 127
                  },
                  "hideOnMobile": {
                    "type": "boolean"
                  },
                  "hideOnDesktop": {
                    "type": "boolean"
                  },
                  "orientation": {
                    "type": "string",
                    "enum": [
                      "stack",
                      "stack-columns"
                    ]
                  },
                  "contentCell": {
                    "type": "boolean",
                    "const": true
                  },
                  "fontSize": {
                    "type": "integer",
                    "minimum": 10,
                    "maximum": 72
                  },
                  "lineHeight": {
                    "type": "number",
                    "minimum": 1,
                    "maximum": 3,
                    "multipleOf": 0.01
                  },
                  "padding": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 64
                  },
                  "alignment": {
                    "type": "string",
                    "enum": [
                      "left",
                      "center",
                      "right"
                    ]
                  }
                },
                "required": [
                  "block"
                ],
                "additionalProperties": false
              }
            },
            "emailText": {
              "type": "string"
            },
            "preheader": {
              "type": "string",
              "maxLength": 250
            },
            "smsBody": {
              "type": "string",
              "maxLength": 1600
            },
            "senderName": {
              "type": "string",
              "maxLength": 160
            },
            "fromEmail": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "email",
                  "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                },
                {
                  "type": "string",
                  "const": ""
                }
              ]
            },
            "replyToEmail": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "email",
                  "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                },
                {
                  "type": "string",
                  "const": ""
                }
              ]
            },
            "smsSender": {
              "type": "string",
              "maxLength": 160
            },
            "physicalAddress": {
              "type": "string",
              "maxLength": 500
            },
            "messageCategory": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "inclusionRuleJson": {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            "exclusionRulesJson": {
              "type": "string",
              "minLength": 2,
              "maxLength": 20000
            },
            "sourceTypesJson": {
              "type": "string",
              "minLength": 2,
              "maxLength": 2000
            },
            "trackingEnabled": {
              "type": "boolean"
            },
            "utmPolicyJson": {
              "anyOf": [
                {
                  "type": "string",
                  "maxLength": 2000
                },
                {
                  "type": "null"
                }
              ]
            },
            "links": {
              "maxItems": 50,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 160
                  },
                  "destinationUrl": {
                    "type": "string",
                    "maxLength": 2000,
                    "format": "uri"
                  }
                },
                "required": [
                  "label",
                  "destinationUrl"
                ]
              }
            },
            "steps": {
              "maxItems": 25,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "channel": {
                    "type": "string",
                    "enum": [
                      "email",
                      "sms"
                    ]
                  },
                  "timezone": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                  },
                  "scheduledAt": {
                    "type": "string",
                    "format": "date-time",
                    "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
                  },
                  "localScheduledAt": {
                    "type": "string"
                  },
                  "sendByAt": {
                    "type": "string",
                    "format": "date-time",
                    "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
                  },
                  "localSendByAt": {
                    "type": "string"
                  },
                  "whyThisTime": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 1000
                  }
                },
                "required": [
                  "channel",
                  "timezone",
                  "whyThisTime"
                ]
              }
            }
          },
          "additionalProperties": false
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-001",
      "CAMP-003"
    ],
    "kind": "campaigns.create"
  },
  {
    "name": "mango.campaigns.update",
    "title": "Campaigns update",
    "method": "PATCH",
    "path": "/api/campaign-revisions/{revisionId}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "composition": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 160
            },
            "designTemplateKey": {
              "type": "string",
              "format": "uuid",
              "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
            },
            "audienceRule": {
              "type": "string",
              "maxLength": 4000
            },
            "emailSubject": {
              "type": "string",
              "maxLength": 250
            },
            "emailBody": {
              "type": "string"
            },
            "emailMobile": {
              "maxItems": 128,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "block": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 127
                  },
                  "hideOnMobile": {
                    "type": "boolean"
                  },
                  "hideOnDesktop": {
                    "type": "boolean"
                  },
                  "orientation": {
                    "type": "string",
                    "enum": [
                      "stack",
                      "stack-columns"
                    ]
                  },
                  "contentCell": {
                    "type": "boolean",
                    "const": true
                  },
                  "fontSize": {
                    "type": "integer",
                    "minimum": 10,
                    "maximum": 72
                  },
                  "lineHeight": {
                    "type": "number",
                    "minimum": 1,
                    "maximum": 3,
                    "multipleOf": 0.01
                  },
                  "padding": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 64
                  },
                  "alignment": {
                    "type": "string",
                    "enum": [
                      "left",
                      "center",
                      "right"
                    ]
                  }
                },
                "required": [
                  "block"
                ],
                "additionalProperties": false
              }
            },
            "emailText": {
              "type": "string"
            },
            "preheader": {
              "type": "string",
              "maxLength": 250
            },
            "smsBody": {
              "type": "string",
              "maxLength": 1600
            },
            "senderName": {
              "type": "string",
              "maxLength": 160
            },
            "fromEmail": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "email",
                  "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                },
                {
                  "type": "string",
                  "const": ""
                }
              ]
            },
            "replyToEmail": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "email",
                  "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                },
                {
                  "type": "string",
                  "const": ""
                }
              ]
            },
            "smsSender": {
              "type": "string",
              "maxLength": 160
            },
            "physicalAddress": {
              "type": "string",
              "maxLength": 500
            },
            "messageCategory": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "inclusionRuleJson": {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            "exclusionRulesJson": {
              "type": "string",
              "minLength": 2,
              "maxLength": 20000
            },
            "sourceTypesJson": {
              "type": "string",
              "minLength": 2,
              "maxLength": 2000
            },
            "trackingEnabled": {
              "type": "boolean"
            },
            "utmPolicyJson": {
              "anyOf": [
                {
                  "type": "string",
                  "maxLength": 2000
                },
                {
                  "type": "null"
                }
              ]
            },
            "links": {
              "maxItems": 50,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 160
                  },
                  "destinationUrl": {
                    "type": "string",
                    "maxLength": 2000,
                    "format": "uri"
                  }
                },
                "required": [
                  "label",
                  "destinationUrl"
                ]
              }
            },
            "steps": {
              "maxItems": 25,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "channel": {
                    "type": "string",
                    "enum": [
                      "email",
                      "sms"
                    ]
                  },
                  "timezone": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                  },
                  "scheduledAt": {
                    "type": "string",
                    "format": "date-time",
                    "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
                  },
                  "localScheduledAt": {
                    "type": "string"
                  },
                  "sendByAt": {
                    "type": "string",
                    "format": "date-time",
                    "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
                  },
                  "localSendByAt": {
                    "type": "string"
                  },
                  "whyThisTime": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 1000
                  }
                },
                "required": [
                  "channel",
                  "timezone",
                  "whyThisTime"
                ]
              }
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "revisionId",
        "composition"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-003",
      "CAMP-007"
    ],
    "kind": "campaigns.update",
    "unwrap": "composition"
  },
  {
    "name": "mango.campaigns.duplicate",
    "title": "Campaigns duplicate",
    "method": "POST",
    "path": "/api/campaigns/{id}/duplicate",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-018"
    ],
    "kind": "campaigns.duplicate"
  },
  {
    "name": "mango.campaigns.followup",
    "title": "Campaigns followup",
    "method": "POST",
    "path": "/api/campaigns/{id}/followup",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "subject": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "delayHours": {
          "type": "integer",
          "minimum": 1,
          "maximum": 720
        },
        "metric": {
          "type": "string",
          "enum": [
            "click",
            "open-estimate"
          ]
        }
      },
      "required": [
        "id",
        "subject",
        "delayHours",
        "metric"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-019"
    ],
    "kind": "campaigns.followup"
  },
  {
    "name": "mango.campaigns.edit_schedule",
    "title": "Campaigns edit schedule",
    "method": "POST",
    "path": "/api/campaigns/{id}/edit-schedule",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-005",
      "CAMP-007"
    ],
    "kind": "campaigns.edit_schedule"
  },
  {
    "name": "mango.campaigns.check",
    "title": "Campaigns check",
    "method": "GET",
    "path": "/api/campaigns/{id}/review",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CAMP-004"
    ],
    "kind": "campaigns.check"
  },
  {
    "name": "mango.campaigns.refresh_checks",
    "title": "Campaigns refresh checks",
    "method": "POST",
    "path": "/api/campaigns/{id}/checks",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "CAMP-004",
      "MSG-006"
    ],
    "kind": "campaigns.refresh_checks"
  },
  {
    "name": "mango.campaigns.authorize",
    "title": "Campaigns authorize",
    "method": "POST",
    "path": "/api/campaigns/{id}/approve",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "CAMP-004",
      "AUD-005",
      "SEND-001"
    ],
    "kind": "campaigns.authorize"
  },
  {
    "name": "mango.campaigns.reauthorize",
    "title": "Campaigns reauthorize",
    "method": "POST",
    "path": "/api/campaigns/{id}/reapprove",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "CAMP-004",
      "MSG-001"
    ],
    "kind": "campaigns.reauthorize"
  },
  {
    "name": "mango.campaigns.test_send",
    "title": "Campaigns test send",
    "method": "POST",
    "path": "/api/campaigns/{id}/test-send",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "channel": {
          "type": "string",
          "enum": [
            "email",
            "sms"
          ]
        },
        "to": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          }
        }
      },
      "required": [
        "id",
        "revisionId",
        "channel",
        "to"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "CAMP-006",
      "MSG-001"
    ],
    "kind": "campaigns.test_send"
  },
  {
    "name": "mango.campaigns.pause",
    "title": "Campaigns pause",
    "method": "POST",
    "path": "/api/campaigns/{id}/pause",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live"
    ],
    "clauses": [
      "CAMP-005",
      "CAMP-011"
    ],
    "kind": "campaigns.pause"
  },
  {
    "name": "mango.campaigns.resume",
    "title": "Campaigns resume",
    "method": "POST",
    "path": "/api/campaigns/{id}/resume",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live"
    ],
    "clauses": [
      "CAMP-005",
      "CAMP-011"
    ],
    "kind": "campaigns.resume"
  },
  {
    "name": "mango.campaigns.cancel",
    "title": "Campaigns cancel",
    "method": "POST",
    "path": "/api/campaigns/{id}/cancel",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard",
      "live"
    ],
    "clauses": [
      "CAMP-005",
      "CAMP-011"
    ],
    "kind": "campaigns.cancel"
  },
  {
    "name": "mango.audience.read",
    "title": "Audience read",
    "method": "GET",
    "path": "/api/audience",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CONT-001",
      "AUD-001"
    ],
    "kind": "audience.read"
  },
  {
    "name": "mango.contacts.read",
    "title": "Contacts read",
    "method": "GET",
    "path": "/api/contacts/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard",
      "sensitive"
    ],
    "clauses": [
      "CONT-001",
      "OPER-004"
    ],
    "kind": "contacts.read"
  },
  {
    "name": "mango.contacts.optout",
    "title": "Contacts optout",
    "method": "POST",
    "path": "/api/contacts/{id}/opt-out",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "channel": {
          "type": "string",
          "enum": [
            "email",
            "sms"
          ]
        }
      },
      "required": [
        "id",
        "channel"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "CONT-004"
    ],
    "kind": "contacts.optout"
  },
  {
    "name": "mango.contacts.merge",
    "title": "Contacts merge",
    "method": "POST",
    "path": "/api/contacts/merge",
    "inputSchema": {
      "type": "object",
      "properties": {
        "survivorContactId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "mergedContactId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "survivorContactId",
        "mergedContactId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "destructive"
    ],
    "clauses": [
      "CONT-008"
    ],
    "kind": "contacts.merge"
  },
  {
    "name": "mango.contacts.consent",
    "title": "Contacts consent",
    "method": "POST",
    "path": "/api/contacts/consent",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "contact": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "format": "email",
              "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
            },
            "phone": {
              "type": "string",
              "maxLength": 30
            },
            "displayName": {
              "type": "string",
              "maxLength": 200
            }
          }
        },
        "channel": {
          "type": "string",
          "enum": [
            "email",
            "sms"
          ]
        },
        "brandOrLegalSender": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "smsProgram": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "timeZone": {
          "type": "string",
          "maxLength": 100
        },
        "locationSource": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "locationRecordedAt": {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
        },
        "messageCategory": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "frequencyDisclosure": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "destinationJurisdiction": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "captureMethod": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "captureSource": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "consentText": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "consentVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "occurredAt": {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
        },
        "expressWrittenConsent": {
          "type": "boolean",
          "const": true
        },
        "permissionMethod": {
          "type": "string",
          "enum": [
            "in-person",
            "event",
            "phone",
            "written"
          ]
        },
        "affirmed": {
          "type": "boolean",
          "const": true
        },
        "properties": {
          "type": "object",
          "additionalProperties": {
            "anyOf": [
              {
                "type": "string",
                "maxLength": 2000
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ]
          },
          "maxProperties": 50
        }
      },
      "required": [
        "contact",
        "channel",
        "brandOrLegalSender",
        "messageCategory",
        "frequencyDisclosure",
        "destinationJurisdiction",
        "captureMethod",
        "captureSource",
        "consentText",
        "consentVersion",
        "occurredAt"
      ]
    },
    "readOnly": false,
    "classes": [
      "standard",
      "external"
    ],
    "clauses": [
      "CONT-003",
      "CONT-004"
    ],
    "kind": "contacts.consent"
  },
  {
    "name": "mango.contacts.erase",
    "title": "Contacts erase",
    "method": "DELETE",
    "path": "/api/contacts/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "destructive"
    ],
    "clauses": [
      "CONT-013",
      "BASE-DATA-003"
    ],
    "kind": "contacts.erase"
  },
  {
    "name": "mango.segments.read",
    "title": "Segments read",
    "method": "GET",
    "path": "/api/audience/segments",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "AUD-001"
    ],
    "kind": "segments.read"
  },
  {
    "name": "mango.segments.create",
    "title": "Segments create",
    "method": "POST",
    "path": "/api/audience/segments",
    "inputSchema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "inclusionRuleJson": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "exclusionRulesJson": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "name",
        "inclusionRuleJson",
        "exclusionRulesJson"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "AUD-001"
    ],
    "kind": "segments.create"
  },
  {
    "name": "mango.segments.update",
    "title": "Segments update",
    "method": "PUT",
    "path": "/api/audience/segments/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "inclusionRuleJson": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "exclusionRulesJson": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "name",
        "inclusionRuleJson",
        "exclusionRulesJson"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "AUD-001"
    ],
    "kind": "segments.update"
  },
  {
    "name": "mango.segments.delete",
    "title": "Segments delete",
    "method": "DELETE",
    "path": "/api/audience/segments/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "destructive"
    ],
    "clauses": [
      "AUD-001"
    ],
    "kind": "segments.delete"
  },
  {
    "name": "mango.templates.read",
    "title": "Templates read",
    "method": "GET",
    "path": "/api/campaign-templates",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "BUILD-002"
    ],
    "kind": "templates.read"
  },
  {
    "name": "mango.templates.update",
    "title": "Templates update",
    "method": "POST",
    "path": "/api/campaign-templates",
    "inputSchema": {
      "type": "object",
      "properties": {
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "templateId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "updatedAt": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "revisionId",
        "name"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "BUILD-002"
    ],
    "kind": "templates.update"
  },
  {
    "name": "mango.templates.start",
    "title": "Templates start",
    "method": "POST",
    "path": "/api/campaign-templates/{id}/start",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "BUILD-002"
    ],
    "kind": "templates.start"
  },
  {
    "name": "mango.blocks.read",
    "title": "Blocks read",
    "method": "GET",
    "path": "/api/reusable-email-blocks",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "BUILD-004"
    ],
    "kind": "blocks.read"
  },
  {
    "name": "mango.blocks.update",
    "title": "Blocks update",
    "method": "PATCH",
    "path": "/api/reusable-email-blocks/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "version": {
          "type": "integer",
          "minimum": 1
        },
        "block": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "html": {
              "type": "string",
              "minLength": 1,
              "maxLength": 102400
            },
            "mobile": {
              "type": "object",
              "properties": {
                "hideOnMobile": {
                  "type": "boolean"
                },
                "hideOnDesktop": {
                  "type": "boolean"
                },
                "orientation": {
                  "type": "string",
                  "enum": [
                    "stack",
                    "stack-columns"
                  ]
                },
                "contentCell": {
                  "type": "boolean",
                  "const": true
                },
                "fontSize": {
                  "type": "integer",
                  "minimum": 10,
                  "maximum": 72
                },
                "lineHeight": {
                  "type": "number",
                  "minimum": 1,
                  "maximum": 3,
                  "multipleOf": 0.01
                },
                "padding": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 64
                },
                "alignment": {
                  "type": "string",
                  "enum": [
                    "left",
                    "center",
                    "right"
                  ]
                }
              },
              "additionalProperties": false
            }
          },
          "required": [
            "html"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "id",
        "name",
        "version",
        "block"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "BUILD-004"
    ],
    "kind": "blocks.update"
  },
  {
    "name": "mango.assets.attach",
    "title": "Assets attach",
    "method": "POST",
    "path": "/api/campaign-assets",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contentType": {
          "type": "string",
          "enum": [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp"
          ]
        },
        "base64": {
          "type": "string"
        }
      },
      "required": [
        "contentType",
        "base64"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "CAMP-012"
    ],
    "kind": "assets.attach"
  },
  {
    "name": "mango.proposals.read",
    "title": "Proposals read",
    "method": "GET",
    "path": "/api/proposals/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "PROP-001"
    ],
    "kind": "proposals.read"
  },
  {
    "name": "mango.proposals.generate",
    "title": "Proposals generate",
    "method": "POST",
    "path": "/api/proposals/generate",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "PROP-001",
      "PROP-006"
    ],
    "kind": "proposals.generate"
  },
  {
    "name": "mango.proposals.adopt",
    "title": "Proposals adopt",
    "method": "POST",
    "path": "/api/proposals/{id}/adopt",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "PROP-001"
    ],
    "kind": "proposals.adopt"
  },
  {
    "name": "mango.proposals.dismiss",
    "title": "Proposals dismiss",
    "method": "POST",
    "path": "/api/proposals/{id}/dismiss",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "reason": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "reason"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "PROP-001"
    ],
    "kind": "proposals.dismiss"
  },
  {
    "name": "mango.designs.read",
    "title": "Designs read",
    "method": "GET",
    "path": "/api/campaigns/{id}/design-jobs",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "DESIGN-001"
    ],
    "kind": "designs.read"
  },
  {
    "name": "mango.designs.start",
    "title": "Designs start",
    "method": "POST",
    "path": "/api/campaigns/{id}/design-jobs",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "brief": {
          "type": "string"
        },
        "candidates": {
          "type": "integer",
          "minimum": 2,
          "maximum": 4
        }
      },
      "required": [
        "id",
        "brief",
        "candidates"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "DESIGN-001",
      "DESIGN-003"
    ],
    "kind": "designs.start"
  },
  {
    "name": "mango.designs.choose",
    "title": "Designs choose",
    "method": "POST",
    "path": "/api/design-jobs/{id}/choose",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "slot": {
          "type": "string",
          "enum": [
            "A",
            "B",
            "C",
            "D"
          ]
        }
      },
      "required": [
        "id",
        "slot"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "DESIGN-002",
      "DESIGN-003"
    ],
    "kind": "designs.choose"
  },
  {
    "name": "mango.designs.close",
    "title": "Designs close",
    "method": "POST",
    "path": "/api/design-jobs/{id}/close",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "outcome": {
          "type": "string",
          "enum": [
            "applied",
            "discarded"
          ]
        }
      },
      "required": [
        "id",
        "outcome"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "DESIGN-002"
    ],
    "kind": "designs.close"
  },
  {
    "name": "mango.sender.read",
    "title": "Sender read",
    "method": "GET",
    "path": "/api/settings/sender",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "MSG-001"
    ],
    "kind": "sender.read"
  },
  {
    "name": "mango.sender.verify",
    "title": "Sender verify",
    "method": "POST",
    "path": "/api/settings/sender/confirmation",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "MSG-001",
      "MSG-002"
    ],
    "kind": "sender.verify"
  },
  {
    "name": "mango.store.read",
    "title": "Store read",
    "method": "GET",
    "path": "/api/store",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "STORE-001"
    ],
    "kind": "store.read"
  },
  {
    "name": "mango.store.sync",
    "title": "Store sync",
    "method": "POST",
    "path": "/api/store/sync",
    "inputSchema": {
      "type": "object",
      "properties": {
        "sourceType": {
          "type": "string",
          "enum": [
            "customer",
            "product",
            "order",
            "refund",
            "cart",
            "browsing-event"
          ]
        }
      },
      "required": [
        "sourceType"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "STORE-004"
    ],
    "kind": "store.sync"
  },
  {
    "name": "mango.connections.read",
    "title": "Connections read",
    "method": "GET",
    "path": "/api/settings/sending",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "MSG-001"
    ],
    "kind": "connections.read"
  },
  {
    "name": "mango.connections.update",
    "title": "Connections update",
    "method": "POST",
    "path": "/api/settings/sending/connect",
    "inputSchema": {
      "type": "object",
      "properties": {
        "proposalId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "proposalId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "access",
      "security",
      "external"
    ],
    "clauses": [
      "MSG-001",
      "OPER-004"
    ],
    "kind": "connections.update"
  },
  {
    "name": "mango.flows.read",
    "title": "Flows read",
    "method": "GET",
    "path": "/api/flows",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "FLOW-001",
      "FLOW-008"
    ],
    "kind": "flows.read"
  },
  {
    "name": "mango.flows.update",
    "title": "Flows update",
    "method": "POST",
    "path": "/api/flow-drafts",
    "inputSchema": {
      "type": "object",
      "properties": {
        "graph": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "trigger": {
              "type": "string",
              "minLength": 1,
              "maxLength": 300
            },
            "nodes": {
              "minItems": 2,
              "maxItems": 100,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9-]{1,64}$"
                  },
                  "kind": {
                    "type": "string",
                    "enum": [
                      "unavailable",
                      "trigger",
                      "delay",
                      "wait-until",
                      "condition",
                      "trigger-split",
                      "random",
                      "email",
                      "sms",
                      "push",
                      "property",
                      "tag",
                      "webhook",
                      "notify",
                      "task",
                      "exit"
                    ]
                  },
                  "email": {
                    "type": "object",
                    "properties": {
                      "templateId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 200
                      },
                      "subject": {
                        "type": "string",
                        "maxLength": 250
                      },
                      "preheader": {
                        "type": "string",
                        "maxLength": 500
                      },
                      "html": {
                        "type": "string",
                        "maxLength": 500000
                      },
                      "text": {
                        "type": "string",
                        "maxLength": 500000
                      }
                    },
                    "required": [
                      "templateId",
                      "subject",
                      "preheader",
                      "html",
                      "text"
                    ],
                    "additionalProperties": false
                  },
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 300
                  },
                  "next": {
                    "maxItems": 100,
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "id",
                  "kind",
                  "label",
                  "next"
                ],
                "additionalProperties": false
              }
            }
          },
          "required": [
            "name",
            "trigger",
            "nodes"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "graph"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "FLOW-001"
    ],
    "kind": "flows.update",
    "unwrap": "graph"
  },
  {
    "name": "mango.flows.create",
    "title": "Flows create",
    "method": "POST",
    "path": "/api/flows",
    "inputSchema": {
      "type": "object",
      "properties": {
        "kind": {
          "type": "string",
          "enum": [
            "woocommerce-abandoned-checkout"
          ]
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "tag": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "kind",
        "name",
        "tag"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "standard"
    ],
    "clauses": [
      "FLOW-001"
    ],
    "kind": "flows.create"
  },
  {
    "name": "mango.flows.activate",
    "title": "Flows activate",
    "method": "POST",
    "path": "/api/flows/{id}/activate",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live"
    ],
    "clauses": [
      "FLOW-008"
    ],
    "kind": "flows.activate"
  },
  {
    "name": "mango.flows.pause",
    "title": "Flows pause",
    "method": "POST",
    "path": "/api/flows/{id}/pause",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live"
    ],
    "clauses": [
      "FLOW-008"
    ],
    "kind": "flows.pause"
  },
  {
    "name": "mango.publications.publish",
    "title": "Publications publish",
    "method": "POST",
    "path": "/api/campaigns/{id}/publications",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "revisionId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "revisionId"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "PUB-001"
    ],
    "kind": "publications.publish"
  },
  {
    "name": "mango.publications.withdraw",
    "title": "Publications withdraw",
    "method": "DELETE",
    "path": "/api/campaigns/{id}/publications/{publication}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "publication": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [
        "id",
        "publication"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "PUB-001"
    ],
    "kind": "publications.withdraw"
  },
  {
    "name": "mango.reports.read",
    "title": "Reports read",
    "method": "GET",
    "path": "/api/insights",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "RESULT-001"
    ],
    "kind": "reports.read"
  },
  {
    "name": "mango.reports.schedule",
    "title": "Reports schedule",
    "method": "POST",
    "path": "/api/settings/reports/schedules",
    "inputSchema": {
      "type": "object",
      "properties": {
        "reportId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "cadence": {
          "type": "string",
          "enum": [
            "weekly",
            "monthly"
          ]
        },
        "recipients": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          }
        }
      },
      "required": [
        "reportId",
        "cadence",
        "recipients"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "external"
    ],
    "clauses": [
      "REPORT-001"
    ],
    "kind": "reports.schedule"
  },
  {
    "name": "mango.reports.policy",
    "title": "Reports policy",
    "method": "PATCH",
    "path": "/api/settings/reports/schedules/{id}",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "enabled": {
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "enabled"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live"
    ],
    "clauses": [
      "REPORT-001"
    ],
    "kind": "reports.policy"
  },
  {
    "name": "mango.signup.read",
    "title": "Signup read",
    "method": "GET",
    "path": "/api/audience/signup",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "FORM-001"
    ],
    "kind": "signup.read"
  },
  {
    "name": "mango.signup.update",
    "title": "Signup update",
    "method": "PUT",
    "path": "/api/audience/signup",
    "inputSchema": {
      "type": "object",
      "properties": {
        "settings": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "frequencyDisclosure": {
              "type": "string",
              "minLength": 3,
              "maxLength": 200
            },
            "embedOrigins": {
              "default": [],
              "maxItems": 30,
              "type": "array",
              "items": {
                "type": "string",
                "maxLength": 300
              }
            },
            "challengeEnabled": {
              "default": true,
              "type": "boolean"
            },
            "kioskEnabled": {
              "default": false,
              "type": "boolean"
            },
            "kioskDeviceLabel": {
              "default": "",
              "type": "string",
              "maxLength": 100
            }
          },
          "required": [
            "frequencyDisclosure"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "settings"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "live",
      "access",
      "security"
    ],
    "clauses": [
      "FORM-001"
    ],
    "kind": "signup.update",
    "unwrap": "settings"
  },
  {
    "name": "mango.access.read",
    "title": "Access read",
    "method": "GET",
    "path": "/api/operators",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "OPER-004"
    ],
    "kind": "access.read"
  },
  {
    "name": "mango.access.update",
    "title": "Access update",
    "method": "PUT",
    "path": "/api/operators/{id}/role",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "role": {
          "type": "string",
          "enum": [
            "owner",
            "admin",
            "manager",
            "author",
            "analyst",
            "support"
          ]
        },
        "unmaskedContacts": {
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "role",
        "unmaskedContacts"
      ],
      "additionalProperties": false
    },
    "readOnly": false,
    "classes": [
      "access"
    ],
    "clauses": [
      "OPER-004"
    ],
    "kind": "access.update"
  },
  {
    "name": "mango.activity.read",
    "title": "Activity read",
    "method": "GET",
    "path": "/api/activity",
    "inputSchema": {
      "type": "object",
      "properties": {
        "agent": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "operator": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "object": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "readOnly": true,
    "classes": [
      "standard"
    ],
    "clauses": [
      "OPER-007"
    ],
    "kind": "activity.read",
    "query": true
  }
];
