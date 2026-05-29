{
  "x-generator": "NSwag v14.2.0.0 (NJsonSchema v11.1.0.0 (Newtonsoft.Json v13.0.0.0))",
  "openapi": "3.0.0",
  "info": {
    "title": "Template API",
    "version": "v1"
  },
  "servers": [
    {
      "url": "https://dev-backend.ai.odonta.ru"
    }
  ],
  "paths": {
    "/tenant/balance/payment/notification": {
      "post": {
        "tags": [
          "Tenant"
        ],
        "summary": "Webhook уведомления о статусе платежа T-Bank",
        "description": "Принимает POST от T-Bank при смене статуса платежа. Возвращает OK при успешной обработке.",
        "operationId": "ApiEndpointsTenantBalancePaymentNotificationPaymentNotificationEndpoint",
        "requestBody": {
          "x-name": "PaymentNotificationRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ModulePaymentsTBankModelsNotificationPaymentNotificationRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "OK — уведомление обработано"
          },
          "400": {
            "description": "Неверный формат или токен"
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance/payment/initiate": {
      "post": {
        "tags": [
          "Tenant"
        ],
        "summary": "Инициировать оплату покупки тарифа",
        "description": "Создаёт платёж в БД, инициирует платёж в T-Bank и возвращает PaymentURL для редиректа на платёжную форму.",
        "operationId": "ApiEndpointsTenantBalanceInitiateTariffPurchaseInitiatePaymentEndpoint",
        "requestBody": {
          "x-name": "InitiateTariffPurchaseRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsTenantBalanceInitiateTariffPurchaseInitiateTariffPurchaseRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfInitiateTariffPurchaseResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance/usage-history": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "История расхода баланса",
        "description": "Возвращает историю списания секунд за консультации.",
        "operationId": "ApiEndpointsTenantBalanceGetUsageHistoryGetUsageHistoryEndpoint",
        "parameters": [
          {
            "name": "pageNumber",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 1
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 50
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfTenantBalanceUsageEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance/tariff": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "Тарифные планы",
        "description": "Возвращает доступные тарифные уровни для покупки.",
        "operationId": "ApiEndpointsTenantBalanceGetTiersGetTariffsEndpoint",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ApiEndpointsTenantBalanceGetTiersTariffTierResponse"
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance/payment/{id}/status": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "Статус платежа",
        "description": "Возвращает актуальный статус платежа из T-Bank (AUTHORIZED, CONFIRMED, REJECTED и т.д.).",
        "operationId": "ApiEndpointsTenantBalanceGetPaymentStatusGetPaymentStatusEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfGetPaymentStatusResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance/payment-history": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "История платежей",
        "description": "Возвращает историю платежей за пополнение баланса.",
        "operationId": "ApiEndpointsTenantBalanceGetPaymentHistoryGetPaymentHistoryEndpoint",
        "parameters": [
          {
            "name": "pageNumber",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 1
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 50
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfTenantPaymentEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/balance": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "Получение баланса тенанта",
        "description": "Возвращает доступные секунды для обработки консультаций.",
        "operationId": "ApiEndpointsTenantBalanceGetBalanceGetBalanceEndpoint",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiEndpointsTenantBalanceGetBalanceGetBalanceResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/user/update": {
      "put": {
        "tags": [
          "User"
        ],
        "summary": "Редактирование пользователя",
        "description": "",
        "operationId": "ApiEndpointsUserUpdateUserUpdateUserEntpoint",
        "requestBody": {
          "x-name": "UpdateUserRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsUserUpdateUserRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfUserDto"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/user/get": {
      "post": {
        "tags": [
          "User"
        ],
        "summary": "Получение данных пользователя",
        "description": "",
        "operationId": "ApiEndpointsUserGetUserGetUserEndpoint",
        "requestBody": {
          "x-name": "GetUserRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsUserGetUserRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfUserEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/user/me": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "Получение данных текущего пользователя",
        "description": "Возвращает данные пользователя на основе JWT токена",
        "operationId": "ApiEndpointsUserGetMeGetMeEndpoint",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfUserDto"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/tenant/doctors": {
      "get": {
        "tags": [
          "Tenant"
        ],
        "summary": "Получение всех врачей организации",
        "description": "Возвращает всех врачей (пользователей) текущего tenant по данным из JWT токена",
        "operationId": "ApiEndpointsUserGetDoctorsGetDoctorsEndpoint",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfListOfUserDto"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/upload": {
      "post": {
        "tags": [
          "Consultation"
        ],
        "summary": "Загрузка аудио консультации",
        "description": "Загружает аудиофайл консультации, создаёт консультацию и артефакт audio_raw, запускает пайплайн.",
        "operationId": "ApiEndpointsConsultationUploadConsultationUploadConsultationEndpoint",
        "requestBody": {
          "x-name": "UploadConsultationRequest",
          "description": "",
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsConsultationUploadConsultationUploadConsultationRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfConsultationEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/property": {
      "patch": {
        "tags": [
          "Consultation"
        ],
        "summary": "Обновление свойства консультации",
        "description": "Обновляет одно свойство консультации по ID консультации, ID свойства и новому значению.",
        "operationId": "ApiEndpointsConsultationUpdatePropertyUpdateConsultationPropertyEndpoint",
        "requestBody": {
          "x-name": "UpdateConsultationPropertyRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsConsultationUpdatePropertyUpdateConsultationPropertyRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfConsultationPropertyEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/reprocess": {
      "post": {
        "tags": [
          "Consultation"
        ],
        "summary": "Переобработка консультации",
        "description": "Перезапускает весь пайплайн обработки консультации: очищает историю шагов и очередь заданий, перепланирует выполнение с начала.",
        "operationId": "ApiEndpointsConsultationReprocessReprocessConsultationEndpoint",
        "requestBody": {
          "x-name": "ReprocessConsultationRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsConsultationReprocessReprocessConsultationRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfConsultationEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/{consultationId}/audio/{audioNoteId}": {
      "delete": {
        "tags": [
          "Consultation"
        ],
        "summary": "Удалить аудио из консультации",
        "description": "Удаляет аудиозаметку из консультации и связанные артефакты audio_raw.",
        "operationId": "ApiEndpointsConsultationRemoveAudioRemoveAudioEndpoint",
        "parameters": [
          {
            "name": "consultationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          },
          {
            "name": "audioNoteId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/{id}/status": {
      "get": {
        "tags": [
          "Consultation"
        ],
        "operationId": "ApiEndpointsConsultationGetStatusGetConsultationStatusEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfConsultationStatusResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/get": {
      "post": {
        "tags": [
          "Consultation"
        ],
        "summary": "Получение истории консультаций",
        "description": "Получает историю консультаций с пагинацией, поиском, сортировкой и расширенными фильтрами",
        "operationId": "ApiEndpointsConsultationGetListGetConsultationsEndpoint",
        "requestBody": {
          "x-name": "GetConsultationsListRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsConsultationGetListGetConsultationsListRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfConsultationEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/{id}": {
      "get": {
        "tags": [
          "Consultation"
        ],
        "operationId": "ApiEndpointsConsultationGetByIdGetConsultationByIdEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfConsultationEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Consultation"
        ],
        "operationId": "ApiEndpointsConsultationDeleteDeleteConsultationEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/consultation/{consultationId}/audio": {
      "post": {
        "tags": [
          "Consultation"
        ],
        "summary": "Добавить аудио в консультацию",
        "description": "Загружает аудиофайл и привязывает его к существующей консультации (создаёт аудиозаметку, артефакт, перезапускает пайплайн).",
        "operationId": "ApiEndpointsConsultationAddAudioAddAudioEndpoint",
        "parameters": [
          {
            "name": "consultationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "requestBody": {
          "x-name": "AddAudioRequest",
          "description": "",
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsConsultationAddAudioAddAudioRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfAudioNoteEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/medical-record/update": {
      "put": {
        "tags": [
          "Client"
        ],
        "summary": "Обновление медкарты пациента",
        "description": "Обновляет данные медкарты существующего клиента. Передаются только те поля, которые нужно изменить.",
        "operationId": "ApiEndpointsClientUpdateMedicalRecordUpdateMedicalRecordEndpoint",
        "requestBody": {
          "x-name": "UpdateMedicalRecordRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientUpdateMedicalRecordRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientMedicalRecord"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/document/{id}": {
      "put": {
        "tags": [
          "Client"
        ],
        "summary": "Обновить документ клиента",
        "description": "Частичное обновление документа (multipart/form-data или JSON). Поля: ClientId, ConsultationId, Title, Description, Comment, file (замена содержимого). Пустое значение ConsultationId снимает привязку к консультации.",
        "operationId": "ApiEndpointsClientUpdateDocumentUpdateClientDocumentEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "requestBody": {
          "x-name": "UpdateClientDocumentRequest",
          "description": "",
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientUpdateClientDocumentRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientDocumentEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/update": {
      "put": {
        "tags": [
          "Client"
        ],
        "summary": "Обновление клиента",
        "description": "Обновляет данные существующего клиента",
        "operationId": "ApiEndpointsClientUpdateUpdateClientEndpoint",
        "requestBody": {
          "x-name": "UpdateClientRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientUpdateClientRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/document/get": {
      "post": {
        "tags": [
          "Client"
        ],
        "summary": "Получить документы клиентов",
        "description": "Список документов с пагинацией, сортировкой, фильтром по ClientId и поиском по Title, Description, Comment.",
        "operationId": "ApiEndpointsClientGetDocumentsGetClientDocumentsEndpoint",
        "requestBody": {
          "x-name": "GetClientDocumentsRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientGetClientDocumentsRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfClientDocumentEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/{id}": {
      "get": {
        "tags": [
          "Client"
        ],
        "summary": "Получение клиента по ID",
        "description": "Получает клиента по указанному идентификатору",
        "operationId": "ApiEndpointsClientGetByIdGetClientByIdEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/get": {
      "post": {
        "tags": [
          "Client"
        ],
        "summary": "Получение списка клиентов",
        "description": "Получает список клиентов с поддержкой пагинации, поиска и фильтрации по ID",
        "operationId": "ApiEndpointsClientGetGetClientEndpoint",
        "requestBody": {
          "x-name": "GetClientRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientGetClientRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfPagedListOfClientEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/document/{documentId}": {
      "delete": {
        "tags": [
          "Client"
        ],
        "summary": "Удалить документ клиента",
        "description": "Удаляет документ клиента, связанный файл в S3 и запись FileEntity.",
        "operationId": "ApiEndpointsClientDeleteDocumentFileDeleteDocumentFileEndpoint",
        "parameters": [
          {
            "name": "documentId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/delete/{id}": {
      "delete": {
        "tags": [
          "Client"
        ],
        "summary": "Удаление клиента",
        "description": "Удаляет клиента по указанному идентификатору",
        "operationId": "ApiEndpointsClientDeleteDeleteClientEndpoint",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "guid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/document": {
      "post": {
        "tags": [
          "Client"
        ],
        "summary": "Создать документ клиента",
        "description": "Создаёт документ клиента с одним прикреплённым файлом (multipart/form-data). Поля: ClientId и/или ConsultationId, Title, Description, Comment (опционально), file (обязательно). Макс. 50 МБ на файл.",
        "operationId": "ApiEndpointsClientCreateDocumentCreateClientDocumentEndpoint",
        "requestBody": {
          "x-name": "CreateClientDocumentRequest",
          "description": "",
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientCreateClientDocumentRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientDocumentEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/client/create": {
      "post": {
        "tags": [
          "Client"
        ],
        "summary": "Создание клиента",
        "description": "Создает нового клиента с указанными данными",
        "operationId": "ApiEndpointsClientCreateCreateClientEndpoint",
        "requestBody": {
          "x-name": "CreateClientRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsClientCreateClientRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfClientEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/reset-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Отправка ссылки для сброса пароля",
        "description": "Отправляет на почту пользователя ссылку с токеном для сброса пароля.",
        "operationId": "ApiEndpointsAuthenticationResetPasswordResetPasswordEndpoint",
        "requestBody": {
          "x-name": "ResetPasswordRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthResetPasswordRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfString"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/resend-confirmation": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Повторная отправка токена подтверждения email",
        "description": "Отправляет новый токен подтверждения email на указанный адрес.",
        "operationId": "ApiEndpointsAuthenticationResendConfirmationResendConfirmationEndpoint",
        "requestBody": {
          "x-name": "ResendEmailConfirmationRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthResendEmailConfirmationRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfString"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/register": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Регистрация пользователя",
        "description": "Регистрирует нового пользователя по email и паролю. Возвращает JWT токен для авторизации.",
        "operationId": "ApiEndpointsAuthenticationRegisterRegisterEndpoint",
        "requestBody": {
          "x-name": "EmailRegisterRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthEmailRegisterRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApplicationModelsAuthLoginResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/refresh-token": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Обновление JWT токена",
        "description": "Обновляет JWT токен на основе текущего аутентифицированного пользователя.",
        "operationId": "ApiEndpointsAuthenticationRefreshRefreshTokenEndpoint",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApplicationModelsAuthLoginResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/email-login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Авторизация пользователя по email и паролю",
        "description": "Авторизует пользователя по email и паролю. Возвращает JWT токен для дальнейшей работы с API.",
        "operationId": "ApiEndpointsAuthenticationEmailLoginEmailLoginEndpoint",
        "requestBody": {
          "x-name": "EmailLoginRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthEmailLoginRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApplicationModelsAuthLoginResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/confirm-email": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Подтверждение email",
        "description": "Подтверждает email пользователя по токену подтверждения.",
        "operationId": "ApiEndpointsAuthenticationConfirmEmailConfirmEmailEndpoint",
        "requestBody": {
          "x-name": "ConfirmEmailRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthConfirmEmailRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/check-reset-password-token": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Проверка токена сброса пароля",
        "description": "Проверяет валидность токена сброса пароля для пользователя.",
        "operationId": "ApiEndpointsAuthenticationCheckResetPasswordTokenCheckResetPasswordTokenEndpoint",
        "requestBody": {
          "x-name": "CheckResetPasswordTokenRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthCheckResetPasswordTokenRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/auth/change-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Смена пароля по токену сброса",
        "description": "Проверяет токен сброса пароля и устанавливает новый пароль пользователю.",
        "operationId": "ApiEndpointsAuthenticationChangePasswordChangePasswordEndpoint",
        "requestBody": {
          "x-name": "ChangePasswordRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplicationModelsAuthChangePasswordRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResult"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/app/special-offer-application": {
      "post": {
        "tags": [
          "App"
        ],
        "summary": "Отправка заявки на специальное предложение",
        "description": "Публичный эндпоинт для клиник. Сохраняет заявку в БД и отправляет уведомление менеджерам на email.",
        "operationId": "ApiEndpointsAppSpecialOfferApplicationSubmitSpecialOfferApplicationEndpoint",
        "requestBody": {
          "x-name": "SubmitSpecialOfferApplicationRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsAppSpecialOfferApplicationSubmitSpecialOfferApplicationRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Заявка успешно создана"
          },
          "400": {
            "description": "Ошибка валидации"
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    },
    "/app/stat-event": {
      "post": {
        "tags": [
          "App"
        ],
        "summary": "Сохранение события статистики",
        "description": "Сохраняет событие использования приложения для аналитики",
        "operationId": "ApiEndpointsAppSaveStatEventSaveStatEventEndpoint",
        "requestBody": {
          "x-name": "SaveStatEventRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsAppSaveStatEventSaveStatEventRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SharedContractsResultOfStatEventEntity"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "security": [
          {
            "JWTBearerAuth": []
          },
          {
            "Bearer": []
          }
        ]
      }
    },
    "/app/health-check": {
      "post": {
        "tags": [
          "App"
        ],
        "summary": "Проверка состояния приложения",
        "description": "Если вернула 200, значит приложение в рабочем состоянии. Иначе - ошибка работы приложения или недоступность приложения",
        "operationId": "ApiEndpointsAppHealthCheckHealthCheckEndpoint",
        "requestBody": {
          "x-name": "HealthCheckRequest",
          "description": "",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiEndpointsAppHealthCheckHealthCheckRequest"
              }
            }
          },
          "required": true,
          "x-position": 1
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiEndpointsAppHealthCheckHealthCheckResponse"
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "ModulePaymentsTBankModelsNotificationPaymentNotificationRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "TerminalKey": {
            "type": "string",
            "nullable": true
          },
          "OrderId": {
            "type": "string",
            "nullable": true
          },
          "Success": {
            "type": "boolean"
          },
          "Status": {
            "type": "string",
            "nullable": true
          },
          "PaymentId": {
            "type": "integer",
            "format": "int64",
            "nullable": true
          },
          "ErrorCode": {
            "type": "string",
            "nullable": true
          },
          "Amount": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "CardId": {
            "type": "integer",
            "format": "int64",
            "nullable": true
          },
          "Pan": {
            "type": "string",
            "nullable": true
          },
          "ExpDate": {
            "type": "string",
            "nullable": true
          },
          "Token": {
            "type": "string",
            "nullable": true
          },
          "RebillId": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfInitiateTariffPurchaseResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/ApiEndpointsTenantBalanceInitiateTariffPurchaseInitiateTariffPurchaseResponse"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApiEndpointsTenantBalanceInitiateTariffPurchaseInitiateTariffPurchaseResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "success": {
            "type": "boolean"
          },
          "errorCode": {
            "type": "string"
          },
          "message": {
            "type": "string",
            "nullable": true
          },
          "paymentId": {
            "type": "string",
            "nullable": true
          },
          "id": {
            "type": "string",
            "nullable": true
          },
          "amount": {
            "type": "integer",
            "format": "int64",
            "nullable": true
          },
          "paymentURL": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "SharedContractsResult": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "isSuccess": {
            "type": "boolean"
          },
          "error": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApiEndpointsTenantBalanceInitiateTariffPurchaseInitiateTariffPurchaseRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "minutesToPurchase": {
            "type": "number",
            "format": "decimal"
          }
        }
      },
      "SharedContractsResultOfPagedListOfTenantBalanceUsageEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfTenantBalanceUsageEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfTenantBalanceUsageEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantBalanceUsageEntity"
            }
          }
        }
      },
      "InfrastructureDbAppEntitiesTenantBalanceUsageEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "consultationId": {
                "type": "string",
                "format": "guid"
              },
              "consultation": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationEntity"
                  }
                ]
              },
              "secondsUsed": {
                "type": "number",
                "format": "double"
              },
              "balanceBefore": {
                "type": "number",
                "format": "decimal"
              },
              "balanceAfter": {
                "type": "number",
                "format": "decimal"
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesConsultationEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": {
                "$ref": "#/components/schemas/SharedEnumsConsultationType"
              },
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "tenant": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantEntity"
                  }
                ]
              },
              "userId": {
                "type": "string",
                "format": "guid"
              },
              "user": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserEntity"
                  }
                ]
              },
              "clientId": {
                "type": "string",
                "format": "guid"
              },
              "client": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientEntity"
                  }
                ]
              },
              "status": {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationStatus"
              },
              "statusMessage": {
                "type": "string",
                "nullable": true
              },
              "properties": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationPropertyEntity"
                }
              },
              "audioNotes": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/InfrastructureDbAppEntitiesAudioNoteEntity"
                }
              }
            }
          }
        ]
      },
      "SharedEnumsConsultationType": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "PrimaryDoctorClient",
          "SecondaryDoctorClient",
          "CoordinatorClient"
        ],
        "enum": [
          1,
          2,
          3
        ]
      },
      "InfrastructureDbAppEntitiesTenantEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "name": {
            "type": "string",
            "nullable": true
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "contacts": {
            "type": "string",
            "nullable": true
          },
          "balance": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantBalanceEntity"
              }
            ]
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "createdById": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "updatedById": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "deletedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "deletedById": {
            "type": "string",
            "format": "guid",
            "nullable": true
          }
        }
      },
      "InfrastructureDbAppEntitiesTenantBalanceEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "availableSeconds": {
                "type": "number",
                "format": "decimal"
              }
            }
          }
        ]
      },
      "InfrastructureDbBaseEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "createdByUser": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserDto"
              }
            ]
          },
          "updatedByUser": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserDto"
              }
            ]
          }
        }
      },
      "InfrastructureDbAppEntitiesUserDto": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "tenantId": {
            "type": "string",
            "format": "guid"
          },
          "userName": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "type": "string",
            "nullable": true
          },
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "middleName": {
            "type": "string",
            "nullable": true
          },
          "photoUrl": {
            "type": "string",
            "nullable": true
          },
          "birthDate": {
            "type": "string",
            "format": "date",
            "nullable": true
          },
          "clinicRole": {
            "type": "string",
            "nullable": true
          },
          "specialization": {
            "type": "string",
            "nullable": true
          },
          "alias": {
            "type": "string",
            "nullable": true
          },
          "roleAlias": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "InfrastructureDbAppEntitiesUserEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/MicrosoftAspNetCoreIdentityIdentityUserOfGuid"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "createdAt": {
                "type": "string",
                "format": "date-time"
              }
            }
          }
        ]
      },
      "MicrosoftAspNetCoreIdentityIdentityUserOfGuid": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "userName": {
            "type": "string",
            "nullable": true
          },
          "normalizedUserName": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "type": "string",
            "nullable": true
          },
          "normalizedEmail": {
            "type": "string",
            "nullable": true
          },
          "emailConfirmed": {
            "type": "boolean"
          },
          "passwordHash": {
            "type": "string",
            "nullable": true
          },
          "securityStamp": {
            "type": "string",
            "nullable": true
          },
          "concurrencyStamp": {
            "type": "string",
            "nullable": true
          },
          "phoneNumber": {
            "type": "string",
            "nullable": true
          },
          "phoneNumberConfirmed": {
            "type": "boolean"
          },
          "twoFactorEnabled": {
            "type": "boolean"
          },
          "lockoutEnd": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "lockoutEnabled": {
            "type": "boolean"
          },
          "accessFailedCount": {
            "type": "integer",
            "format": "int32"
          }
        }
      },
      "InfrastructureDbAppEntitiesClientEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "tenant": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantEntity"
                  }
                ]
              },
              "firstName": {
                "type": "string",
                "nullable": true
              },
              "middleName": {
                "type": "string",
                "nullable": true
              },
              "lastName": {
                "type": "string",
                "nullable": true
              },
              "phone": {
                "type": "string",
                "nullable": true
              },
              "comment": {
                "type": "string",
                "nullable": true
              },
              "tasks": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/SystemTextJsonJsonDocument"
                  }
                ]
              },
              "birthDate": {
                "type": "string",
                "format": "date",
                "nullable": true
              },
              "lastVisitedAt": {
                "type": "string",
                "format": "date-time"
              },
              "medicalRecord": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientMedicalRecord"
                  }
                ]
              },
              "documents": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientDocumentEntity"
                }
              }
            }
          }
        ]
      },
      "SystemTextJsonJsonDocument": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "rootElement": {}
        }
      },
      "InfrastructureDbAppEntitiesClientMedicalRecord": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "clientId": {
                "type": "string",
                "format": "guid"
              },
              "allergy": {
                "type": "string",
                "nullable": true
              },
              "comorbidities": {
                "type": "string",
                "nullable": true
              },
              "complaints": {
                "type": "string",
                "nullable": true
              },
              "anamnesis": {
                "type": "string",
                "nullable": true
              },
              "treatment": {
                "type": "string",
                "nullable": true
              },
              "diagnosis": {
                "type": "string",
                "nullable": true
              },
              "otherInfo": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesClientDocumentEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "clientId": {
                "type": "string",
                "format": "guid"
              },
              "consultationId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "title": {
                "type": "string",
                "nullable": true
              },
              "description": {
                "type": "string",
                "nullable": true
              },
              "comment": {
                "type": "string",
                "nullable": true
              },
              "fileId": {
                "type": "string",
                "format": "guid"
              },
              "file": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesFileEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesFileEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "externalId": {
                "type": "string",
                "format": "guid"
              },
              "s3Key": {
                "type": "string"
              },
              "fileName": {
                "type": "string"
              },
              "contentType": {
                "type": "string",
                "nullable": true
              },
              "sizeBytes": {
                "type": "integer",
                "format": "int64"
              },
              "fingerprint": {
                "type": "string",
                "nullable": true
              },
              "contentVersion": {
                "type": "integer",
                "format": "int32"
              },
              "variants": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/InfrastructureDbAppEntitiesFileVariantEntity"
                }
              },
              "extension": {
                "type": "string",
                "nullable": true
              },
              "url": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesFileVariantEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "fileId": {
                "type": "string",
                "format": "guid"
              },
              "kind": {
                "$ref": "#/components/schemas/InfrastructureDbAppEnumsFileVariantKind"
              },
              "status": {
                "$ref": "#/components/schemas/InfrastructureDbAppEnumsFileVariantStatus"
              },
              "s3Key": {
                "type": "string",
                "nullable": true
              },
              "contentType": {
                "type": "string"
              },
              "sizeBytes": {
                "type": "integer",
                "format": "int64",
                "nullable": true
              },
              "width": {
                "type": "integer",
                "format": "int32",
                "nullable": true
              },
              "height": {
                "type": "integer",
                "format": "int32",
                "nullable": true
              },
              "sourceVersion": {
                "type": "integer",
                "format": "int32"
              },
              "attemptCount": {
                "type": "integer",
                "format": "int32"
              },
              "lastError": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEnumsFileVariantKind": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "None",
          "Thumb",
          "Preview"
        ],
        "enum": [
          0,
          1,
          2
        ]
      },
      "InfrastructureDbAppEnumsFileVariantStatus": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "NotApplicable",
          "Pending",
          "Processing",
          "Ready",
          "Failed"
        ],
        "enum": [
          0,
          1,
          2,
          3,
          4
        ]
      },
      "InfrastructureDbAppEntitiesConsultationStatus": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "None",
          "InProgress",
          "Failed",
          "Completed"
        ],
        "enum": [
          0,
          1,
          2,
          3
        ]
      },
      "InfrastructureDbAppEntitiesConsultationPropertyEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "consultationId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "parentId": {
                "type": "string",
                "format": "guid"
              },
              "parent": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantSettingsTenantSettingConsultationPropertyEntity"
                  }
                ]
              },
              "value": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesTenantSettingsTenantSettingConsultationPropertyEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "key": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string",
                "nullable": true
              },
              "consultationType": {
                "$ref": "#/components/schemas/SharedEnumsConsultationType"
              },
              "type": {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantSettingsConsultationPropertyType"
              },
              "order": {
                "type": "integer",
                "format": "int32"
              },
              "isEditable": {
                "type": "boolean"
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesTenantSettingsConsultationPropertyType": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "None",
          "Text",
          "Number",
          "Html"
        ],
        "enum": [
          0,
          1,
          2,
          3
        ]
      },
      "InfrastructureDbAppEntitiesAudioNoteEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "tenant": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantEntity"
                  }
                ]
              },
              "consultationId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "tempAudioPath": {
                "type": "string",
                "nullable": true
              },
              "externalId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "link": {
                "type": "string",
                "nullable": true
              },
              "durationSeconds": {
                "type": "number",
                "format": "double",
                "nullable": true
              },
              "transcription": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "ApiEndpointsTenantBalanceGetUsageHistoryGetUsageHistoryRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false
          }
        ]
      },
      "SharedModelsPagination": {
        "type": "object",
        "x-abstract": true,
        "additionalProperties": false
      },
      "ApiEndpointsTenantBalanceGetTiersTariffTierResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "minSeconds": {
            "type": "number",
            "format": "decimal"
          },
          "minMinutes": {
            "type": "number",
            "format": "decimal"
          },
          "pricePerSecond": {
            "type": "number",
            "format": "decimal"
          },
          "pricePerMinuteDisplay": {
            "type": "number",
            "format": "decimal"
          }
        }
      },
      "SharedContractsResultOfGetPaymentStatusResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/ApiEndpointsTenantBalanceGetPaymentStatusGetPaymentStatusResponse"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApiEndpointsTenantBalanceGetPaymentStatusGetPaymentStatusResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "externalPaymentId": {
            "type": "string",
            "nullable": true
          },
          "status": {
            "type": "string",
            "nullable": true
          },
          "amount": {
            "type": "integer",
            "format": "int64",
            "nullable": true
          },
          "success": {
            "type": "boolean"
          },
          "errorCode": {
            "type": "string",
            "nullable": true
          },
          "message": {
            "type": "string",
            "nullable": true
          },
          "localStatus": {
            "type": "string",
            "nullable": true
          },
          "externalPaymentStatus": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApiEndpointsTenantBalanceGetPaymentStatusGetPaymentStatusRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "SharedContractsResultOfPagedListOfTenantPaymentEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfTenantPaymentEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfTenantPaymentEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantPaymentEntity"
            }
          }
        }
      },
      "InfrastructureDbAppEntitiesTenantPaymentEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "amount": {
                "type": "number",
                "format": "decimal"
              },
              "secondsPurchased": {
                "type": "number",
                "format": "decimal"
              },
              "pricePerSecond": {
                "type": "number",
                "format": "decimal"
              },
              "externalProvider": {
                "type": "string",
                "nullable": true
              },
              "externalPaymentId": {
                "type": "string",
                "nullable": true
              },
              "status": {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantPaymentStatus"
              },
              "externalStatus": {
                "type": "string",
                "nullable": true
              },
              "paidAt": {
                "type": "string",
                "format": "date-time",
                "nullable": true
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesTenantPaymentStatus": {
        "type": "integer",
        "description": "",
        "x-enumNames": [
          "Pending",
          "Paid",
          "Failed",
          "Refunded"
        ],
        "enum": [
          0,
          1,
          2,
          3
        ]
      },
      "ApiEndpointsTenantBalanceGetPaymentHistoryGetPaymentHistoryRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false
          }
        ]
      },
      "ApiEndpointsTenantBalanceGetBalanceGetBalanceResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "availableSeconds": {
            "type": "number",
            "format": "decimal"
          },
          "availableMinutes": {
            "type": "number",
            "format": "decimal"
          }
        }
      },
      "SharedContractsResultOfUserDto": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserDto"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsUserUpdateUserRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "middleName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "hiddenDescription": {
            "type": "string",
            "nullable": true
          },
          "phoneNumber": {
            "type": "string",
            "nullable": true
          },
          "birthDate": {
            "type": "string",
            "format": "date",
            "nullable": true
          },
          "gender": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "clinicRole": {
            "type": "string",
            "nullable": true
          },
          "specialization": {
            "type": "string",
            "nullable": true
          },
          "additional": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/SystemTextJsonJsonDocument"
              }
            ]
          }
        }
      },
      "SharedContractsResultOfPagedListOfUserEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfUserEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfUserEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserEntity"
            }
          }
        }
      },
      "ApplicationModelsUserGetUserRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "ids": {
                "type": "array",
                "nullable": true,
                "items": {
                  "type": "string",
                  "format": "guid"
                }
              },
              "search": {
                "type": "string",
                "nullable": true
              },
              "order": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "SharedContractsResultOfListOfUserDto": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "array",
                "nullable": true,
                "items": {
                  "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserDto"
                }
              }
            }
          }
        ]
      },
      "SharedContractsResultOfConsultationEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApiEndpointsConsultationUploadConsultationUploadConsultationRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "clientId": {
            "type": "string",
            "format": "guid"
          },
          "type": {
            "$ref": "#/components/schemas/SharedEnumsConsultationType"
          },
          "file": {
            "type": "string",
            "format": "binary",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfConsultationPropertyEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationPropertyEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApiEndpointsConsultationUpdatePropertyUpdateConsultationPropertyRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "consultationId": {
            "type": "string",
            "format": "guid"
          },
          "propertyId": {
            "type": "string",
            "format": "guid"
          },
          "value": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApiEndpointsConsultationReprocessReprocessConsultationRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          }
        }
      },
      "ApiEndpointsConsultationRemoveAudioRemoveAudioRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "SharedContractsResultOfConsultationStatusResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/ApplicationModelsConsultationConsultationStatusResponse"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsConsultationConsultationStatusResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "consultationId": {
            "type": "string",
            "format": "guid"
          },
          "overallStatus": {
            "type": "string"
          },
          "stageMessage": {
            "type": "string"
          },
          "steps": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ApplicationModelsConsultationStepStatusDto"
            }
          }
        }
      },
      "ApplicationModelsConsultationStepStatusDto": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "stepName": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "error": {
            "type": "string",
            "nullable": true
          },
          "startedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "finishedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          }
        }
      },
      "ApiEndpointsConsultationGetStatusGetConsultationStatusRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "SharedContractsResultOfPagedListOfConsultationEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfConsultationEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfConsultationEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesConsultationEntity"
            }
          }
        }
      },
      "ApiEndpointsConsultationGetListGetConsultationsListRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/ApplicationModelsConsultationGetConsultationsRequest"
          },
          {
            "type": "object",
            "additionalProperties": false
          }
        ]
      },
      "ApplicationModelsConsultationGetConsultationsRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "clientIds": {
                "type": "array",
                "default": "[]",
                "nullable": true,
                "items": {
                  "type": "string",
                  "format": "guid"
                }
              },
              "doctorIds": {
                "type": "array",
                "default": "[]",
                "nullable": true,
                "items": {
                  "type": "string",
                  "format": "guid"
                }
              },
              "search": {
                "type": "string",
                "nullable": true
              },
              "createdAtFrom": {
                "type": "string",
                "format": "date-time",
                "default": "2020-04-08T14:35:00.571Z",
                "nullable": true
              },
              "createdAtTo": {
                "type": "string",
                "format": "date-time",
                "default": "2040-04-08T14:35:00.571Z",
                "nullable": true
              },
              "order": {
                "type": "string",
                "default": "-id",
                "nullable": true
              }
            }
          }
        ]
      },
      "ApiEndpointsConsultationGetByIdGetConsultationByIdRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "ApiEndpointsConsultationDeleteDeleteConsultationRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "SharedContractsResultOfAudioNoteEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesAudioNoteEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApiEndpointsConsultationAddAudioAddAudioRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "file": {
            "type": "string",
            "format": "binary",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfClientMedicalRecord": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientMedicalRecord"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsClientUpdateMedicalRecordRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "clientId": {
            "type": "string",
            "format": "guid"
          },
          "allergy": {
            "type": "string",
            "nullable": true
          },
          "comorbidities": {
            "type": "string",
            "nullable": true
          },
          "anamnesis": {
            "type": "string",
            "nullable": true
          },
          "complaints": {
            "type": "string",
            "nullable": true
          },
          "diagnosis": {
            "type": "string",
            "nullable": true
          },
          "treatment": {
            "type": "string",
            "nullable": true
          },
          "otherInfo": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfClientDocumentEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientDocumentEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsClientUpdateClientDocumentRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "clientId": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "consultationId": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "title": {
            "type": "string",
            "nullable": true
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "file": {
            "type": "string",
            "format": "binary",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfClientEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsClientUpdateClientRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "format": "guid"
          },
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "middleName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "phone": {
            "type": "string",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "tasks": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/SystemTextJsonJsonDocument"
              }
            ]
          },
          "birthDate": {
            "type": "string",
            "format": "date",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfPagedListOfClientDocumentEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfClientDocumentEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfClientDocumentEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientDocumentEntity"
            }
          }
        }
      },
      "ApplicationModelsClientGetClientDocumentsRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "clientId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "search": {
                "type": "string",
                "nullable": true
              },
              "order": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "ApiEndpointsClientGetByIdGetClientByIdRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "SharedContractsResultOfPagedListOfClientEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureModelsPagedListOfClientEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureModelsPagedListOfClientEntity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "currentPage": {
            "type": "integer",
            "format": "int32"
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "pageSize": {
            "type": "integer",
            "format": "int32"
          },
          "totalCount": {
            "type": "integer",
            "format": "int32"
          },
          "hasPrevious": {
            "type": "boolean"
          },
          "hasNext": {
            "type": "boolean"
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/InfrastructureDbAppEntitiesClientEntity"
            }
          }
        }
      },
      "ApplicationModelsClientGetClientRequest": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedModelsPagination"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "ids": {
                "type": "array",
                "nullable": true,
                "items": {
                  "type": "string",
                  "format": "guid"
                }
              },
              "search": {
                "type": "string",
                "nullable": true
              },
              "order": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "ApiEndpointsClientDeleteDocumentFileDeleteDocumentFileRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "ApiEndpointsClientDeleteDeleteClientRequest": {
        "type": "object",
        "additionalProperties": false
      },
      "ApplicationModelsClientCreateClientDocumentRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "clientId": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "consultationId": {
            "type": "string",
            "format": "guid",
            "nullable": true
          },
          "title": {
            "type": "string",
            "nullable": true
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "file": {
            "type": "string",
            "format": "binary",
            "nullable": true
          }
        }
      },
      "ApplicationModelsClientCreateClientRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "middleName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "phone": {
            "type": "string",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "tasks": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/SystemTextJsonJsonDocument"
              }
            ]
          },
          "birthDate": {
            "type": "string",
            "format": "date",
            "nullable": true
          }
        }
      },
      "SharedContractsResultOfString": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "string",
                "nullable": true
              }
            }
          }
        ]
      },
      "ApplicationModelsAuthResetPasswordRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "email": {
            "type": "string"
          }
        }
      },
      "ApplicationModelsAuthResendEmailConfirmationRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "email": {
            "type": "string"
          }
        }
      },
      "ApplicationModelsAuthLoginResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "user": {
            "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserEntity"
          },
          "profile": {
            "nullable": true,
            "oneOf": [
              {
                "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserProfileEntity"
              }
            ]
          },
          "token": {
            "type": "string"
          }
        }
      },
      "InfrastructureDbAppEntitiesUserProfileEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "tenantId": {
                "type": "string",
                "format": "guid"
              },
              "tenant": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesTenantEntity"
                  }
                ]
              },
              "userId": {
                "type": "string",
                "format": "guid"
              },
              "telegramId": {
                "type": "integer",
                "format": "int64",
                "nullable": true
              },
              "telegramUserName": {
                "type": "string",
                "nullable": true
              },
              "firstName": {
                "type": "string",
                "nullable": true
              },
              "middleName": {
                "type": "string",
                "nullable": true
              },
              "lastName": {
                "type": "string",
                "nullable": true
              },
              "photoUrl": {
                "type": "string",
                "nullable": true
              },
              "birthDate": {
                "type": "string",
                "format": "date",
                "nullable": true
              },
              "gender": {
                "type": "integer",
                "format": "int32",
                "nullable": true
              },
              "clinicRole": {
                "type": "string",
                "nullable": true
              },
              "specialization": {
                "type": "string",
                "nullable": true
              },
              "additional": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/SystemTextJsonJsonDocument"
                  }
                ]
              }
            }
          }
        ]
      },
      "ApplicationModelsAuthEmailRegisterRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          },
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "middleName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "birthDate": {
            "type": "string",
            "format": "date",
            "nullable": true
          },
          "gender": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "clinicRole": {
            "type": "string",
            "nullable": true
          },
          "specialization": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApplicationModelsAuthEmailLoginRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          },
          "utm": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApplicationModelsAuthConfirmEmailRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "userId": {
            "type": "string",
            "format": "guid"
          },
          "token": {
            "type": "string"
          }
        }
      },
      "ApplicationModelsAuthCheckResetPasswordTokenRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "userId": {
            "type": "string",
            "format": "guid"
          },
          "token": {
            "type": "string"
          }
        }
      },
      "ApplicationModelsAuthChangePasswordRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "userId": {
            "type": "string",
            "format": "guid"
          },
          "token": {
            "type": "string"
          },
          "newPassword": {
            "type": "string"
          }
        }
      },
      "ApiEndpointsAppSpecialOfferApplicationSubmitSpecialOfferApplicationRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "clinicInfo",
          "contactPhone",
          "requestDescription"
        ],
        "properties": {
          "clinicInfo": {
            "type": "string",
            "maxLength": 500,
            "minLength": 1
          },
          "contactPhone": {
            "type": "string",
            "maxLength": 50,
            "minLength": 1
          },
          "requestDescription": {
            "type": "string",
            "maxLength": 5000,
            "minLength": 1
          }
        }
      },
      "SharedContractsResultOfStatEventEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SharedContractsResult"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "value": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesStatEventEntity"
                  }
                ]
              }
            }
          }
        ]
      },
      "InfrastructureDbAppEntitiesStatEventEntity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InfrastructureDbBaseEntity"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "userId": {
                "type": "string",
                "format": "guid",
                "nullable": true
              },
              "user": {
                "nullable": true,
                "oneOf": [
                  {
                    "$ref": "#/components/schemas/InfrastructureDbAppEntitiesUserEntity"
                  }
                ]
              },
              "sessionId": {
                "type": "integer",
                "format": "int64",
                "nullable": true
              },
              "utm": {
                "type": "string",
                "nullable": true
              },
              "type": {
                "type": "string",
                "maxLength": 30,
                "nullable": true
              }
            }
          }
        ]
      },
      "ApiEndpointsAppSaveStatEventSaveStatEventRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ApiEndpointsAppHealthCheckHealthCheckResponse": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "result": {
            "type": "string"
          }
        }
      },
      "ApiEndpointsAppHealthCheckHealthCheckRequest": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "mockMessage": {
            "type": "string",
            "nullable": true
          }
        }
      }
    },
    "securitySchemes": {
      "JWTBearerAuth": {
        "type": "http",
        "description": "Enter a JWT token to authorize the requests...",
        "scheme": "Bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}