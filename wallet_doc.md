GET /tenant/balance

Получение баланса тенанта.

Возвращает доступное время для обработки консультаций:

availableSeconds — доступное количество секунд

availableMinutes — доступное количество минут

Параметры: отсутствуют

Успешный ответ 200:

{
  "availableSeconds": 0,
  "availableMinutes": 0
}

GET /tenant/balance/payment-history

Получение истории платежей по пополнению баланса тенанта.

Возвращает список платежей с пагинацией.

Query-параметры:

pageNumber — номер страницы, обязательный

pageSize — количество элементов на странице, обязательный

Успешный ответ 200:
{
  "isSuccess": true,
  "error": "string",
  "value": {
    "currentPage": 0,
    "totalPages": 0,
    "pageSize": 0,
    "totalCount": 0,
    "hasPrevious": true,
    "hasNext": true,
    "data": [
      {
        "id": "string",
        "createdAt": "2026-03-07T19:35:42.199Z",
        "createdByUser": {
          "id": "string",
          "tenantId": "string",
          "userName": "string",
          "email": "string",
          "firstName": "string",
          "lastName": "string",
          "middleName": "string",
          "photoUrl": "string",
          "birthDate": "2026-03-07",
          "clinicRole": "string",
          "specialization": "string",
          "alias": "string",
          "roleAlias": "string"
        },
        "updatedByUser": {
          "id": "string",
          "tenantId": "string",
          "userName": "string",
          "email": "string",
          "firstName": "string",
          "lastName": "string",
          "middleName": "string",
          "photoUrl": "string",
          "birthDate": "2026-03-07",
          "clinicRole": "string",
          "specialization": "string",
          "alias": "string",
          "roleAlias": "string"
        },
        "tenantId": "string",
        "amount": 0,
        "secondsPurchased": 0,
        "pricePerSecond": 0,
        "externalProvider": "string",
        "externalPaymentId": "string",
        "status": 0,
        "externalStatus": "string",
        "paidAt": "2026-03-07T19:35:42.199Z"
      }
    ]
  }
}

GET /tenant/balance/payment/{id}/status

Получение текущего статуса платежа из платёжной системы (например, T-Bank).

Позволяет проверить актуальный статус оплаты: AUTHORIZED, CONFIRMED, REJECTED и другие.

Path-параметры:

id — идентификатор платежа (GUID), обязательный

Успешный ответ 200:
{
  "isSuccess": true,
  "error": "string",
  "value": {
    "id": "string",
    "externalPaymentId": "string",
    "status": "string",
    "amount": 0,
    "success": true,
    "errorCode": "string",
    "message": "string",
    "localStatus": "string",
    "externalPaymentStatus": "string"
  }
}

POST /tenant/balance/payment/initiate

Инициация оплаты покупки минут (пополнение баланса).

Создаёт запись платежа в базе данных, инициирует оплату во внешней платёжной системе (T-Bank) и возвращает paymentURL для перехода на платёжную форму.

Параметры: отсутствуют

Request body:

{
  "minutesToPurchase": 0
}

Поля запроса:

minutesToPurchase — количество минут, которые пользователь хочет приобрести

Успешный ответ 200:

{
  "isSuccess": true,
  "error": "string",
  "value": {
    "success": true,
    "errorCode": "string",
    "message": "string",
    "paymentId": "string",
    "id": "string",
    "amount": 0,
    "paymentURL": "string"
  }
}

POST /tenant/balance/payment/notification

Webhook для получения уведомлений от платёжной системы T-Bank о смене статуса платежа.

Endpoint принимает POST-запрос от платёжной системы при изменении состояния платежа и обновляет статус оплаты в системе.

После успешной обработки сервер возвращает 200 OK.

Параметры: отсутствуют

Request body:

{
  "TerminalKey": "string",
  "OrderId": "string",
  "Success": true,
  "Status": "string",
  "PaymentId": 0,
  "ErrorCode": "string",
  "Amount": 0,
  "CardId": 0,
  "Pan": "string",
  "ExpDate": "string",
  "Token": "string",
  "RebillId": "string"
}

GET /tenant/balance/tariff

Получение доступных тарифных планов для покупки времени консультаций.

Endpoint возвращает список тарифных уровней, которые определяют минимальное количество минут для покупки и стоимость.

Параметры: отсутствуют

Успешный ответ 200:

[
  {
    "minSeconds": 0,
    "minMinutes": 0,
    "pricePerSecond": 0,
    "pricePerMinuteDisplay": 0
  }
]

GET /tenant/balance/usage-history

Получение истории списания времени с баланса тенанта за консультации.

Endpoint возвращает список операций списания секунд с пагинацией. В каждой записи есть информация о консультации и изменении баланса до и после списания.

Query-параметры:

pageNumber — номер страницы, обязательный

pageSize — количество элементов на странице, обязательный

Успешный ответ 200:

{
  "isSuccess": true,
  "error": "string",
  "value": {
    "currentPage": 0,
    "totalPages": 0,
    "pageSize": 0,
    "totalCount": 0,
    "hasPrevious": true,
    "hasNext": true,
    "data": [
      {
        "id": "string",
        "createdAt": "2026-03-07T19:42:15.928Z",
        "createdByUser": {
          "id": "string",
          "tenantId": "string",
          "userName": "string",
          "email": "string",
          "firstName": "string",
          "lastName": "string",
          "middleName": "string",
          "photoUrl": "string",
          "birthDate": "2026-03-07",
          "clinicRole": "string",
          "specialization": "string",
          "alias": "string",
          "roleAlias": "string"
        },
        "updatedByUser": {
          "id": "string",
          "tenantId": "string",
          "userName": "string",
          "email": "string",
          "firstName": "string",
          "lastName": "string",
          "middleName": "string",
          "photoUrl": "string",
          "birthDate": "2026-03-07",
          "clinicRole": "string",
          "specialization": "string",
          "alias": "string",
          "roleAlias": "string"
        },
        "tenantId": "string",
        "consultationId": "string",
        "consultation": {
          "id": "string",
          "createdAt": "2026-03-07T19:42:15.928Z",
          "createdByUser": {
            "id": "string",
            "tenantId": "string",
            "userName": "string",
            "email": "string",
            "firstName": "string",
            "lastName": "string",
            "middleName": "string",
            "photoUrl": "string",
            "birthDate": "2026-03-07",
            "clinicRole": "string",
            "specialization": "string",
            "alias": "string",
            "roleAlias": "string"
          },
          "updatedByUser": {
            "id": "string",
            "tenantId": "string",
            "userName": "string",
            "email": "string",
            "firstName": "string",
            "lastName": "string",
            "middleName": "string",
            "photoUrl": "string",
            "birthDate": "2026-03-07",
            "clinicRole": "string",
            "specialization": "string",
            "alias": "string",
            "roleAlias": "string"
          },
          "type": 1,
          "tenantId": "string",
          "tenant": {
            "id": "string",
            "name": "string",
            "description": "string",
            "contacts": "string",
            "balance": {
              "id": "string",
              "createdAt": "2026-03-07T19:42:15.928Z",
              "createdByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "updatedByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "tenantId": "string",
              "availableSeconds": 0
            },
            "createdAt": "2026-03-07T19:42:15.928Z",
            "createdById": "string",
            "updatedAt": "2026-03-07T19:42:15.928Z",
            "updatedById": "string",
            "deletedAt": "2026-03-07T19:42:15.928Z",
            "deletedById": "string"
          },
          "userId": "string",
          "user": {
            "id": "string",
            "userName": "string",
            "normalizedUserName": "string",
            "email": "string",
            "normalizedEmail": "string",
            "emailConfirmed": true,
            "passwordHash": "string",
            "securityStamp": "string",
            "concurrencyStamp": "string",
            "phoneNumber": "string",
            "phoneNumberConfirmed": true,
            "twoFactorEnabled": true,
            "lockoutEnd": "2026-03-07T19:42:15.928Z",
            "lockoutEnabled": true,
            "accessFailedCount": 0,
            "tenantId": "string",
            "createdAt": "2026-03-07T19:42:15.928Z"
          },
          "clientId": "string",
          "client": {
            "id": "string",
            "createdAt": "2026-03-07T19:42:15.928Z",
            "createdByUser": {
              "id": "string",
              "tenantId": "string",
              "userName": "string",
              "email": "string",
              "firstName": "string",
              "lastName": "string",
              "middleName": "string",
              "photoUrl": "string",
              "birthDate": "2026-03-07",
              "clinicRole": "string",
              "specialization": "string",
              "alias": "string",
              "roleAlias": "string"
            },
            "updatedByUser": {
              "id": "string",
              "tenantId": "string",
              "userName": "string",
              "email": "string",
              "firstName": "string",
              "lastName": "string",
              "middleName": "string",
              "photoUrl": "string",
              "birthDate": "2026-03-07",
              "clinicRole": "string",
              "specialization": "string",
              "alias": "string",
              "roleAlias": "string"
            },
            "tenantId": "string",
            "tenant": {
              "id": "string",
              "name": "string",
              "description": "string",
              "contacts": "string",
              "balance": {
                "id": "string",
                "createdAt": "2026-03-07T19:42:15.928Z",
                "createdByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "updatedByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "tenantId": "string",
                "availableSeconds": 0
              },
              "createdAt": "2026-03-07T19:42:15.928Z",
              "createdById": "string",
              "updatedAt": "2026-03-07T19:42:15.928Z",
              "updatedById": "string",
              "deletedAt": "2026-03-07T19:42:15.928Z",
              "deletedById": "string"
            },
            "firstName": "string",
            "lastName": "string",
            "phone": "string",
            "comment": "string",
            "tasks": {
              "rootElement": "string"
            },
            "birthDate": "2026-03-07",
            "medicalRecord": {
              "id": "string",
              "createdAt": "2026-03-07T19:42:15.928Z",
              "createdByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "updatedByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "tenantId": "string",
              "clientId": "string",
              "allergy": "string",
              "comorbidities": "string",
              "complaints": "string",
              "anamnesis": "string",
              "treatment": "string",
              "diagnosis": "string",
              "otherInfo": "string"
            },
            "documents": [
              {
                "id": "string",
                "createdAt": "2026-03-07T19:42:15.928Z",
                "createdByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "updatedByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "tenantId": "string",
                "clientId": "string",
                "consultationId": "string",
                "title": "string",
                "description": "string"
              }
            ]
          },
          "status": 0,
          "statusMessage": "string",
          "properties": [
            {
              "id": "string",
              "createdAt": "2026-03-07T19:42:15.928Z",
              "createdByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "updatedByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "tenantId": "string",
              "consultationId": "string",
              "parentId": "string",
              "parent": {
                "id": "string",
                "createdAt": "2026-03-07T19:42:15.928Z",
                "createdByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "updatedByUser": {
                  "id": "string",
                  "tenantId": "string",
                  "userName": "string",
                  "email": "string",
                  "firstName": "string",
                  "lastName": "string",
                  "middleName": "string",
                  "photoUrl": "string",
                  "birthDate": "2026-03-07",
                  "clinicRole": "string",
                  "specialization": "string",
                  "alias": "string",
                  "roleAlias": "string"
                },
                "tenantId": "string",
                "key": "string",
                "title": "string",
                "description": "string",
                "consultationType": 1,
                "type": 0,
                "order": 0,
                "isEditable": true
              },
              "value": "string"
            }
          ],
          "audioNotes": [
            {
              "id": "string",
              "createdAt": "2026-03-07T19:42:15.928Z",
              "createdByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "updatedByUser": {
                "id": "string",
                "tenantId": "string",
                "userName": "string",
                "email": "string",
                "firstName": "string",
                "lastName": "string",
                "middleName": "string",
                "photoUrl": "string",
                "birthDate": "2026-03-07",
                "clinicRole": "string",
                "specialization": "string",
                "alias": "string",
                "roleAlias": "string"
              },
              "tenantId": "string",
              "tenant": {
                "id": "string",
                "name": "string",
                "description": "string",
                "contacts": "string",
                "balance": {
                  "id": "string",
                  "createdAt": "2026-03-07T19:42:15.928Z",
                  "createdByUser": {
                    "id": "string",
                    "tenantId": "string",
                    "userName": "string",
                    "email": "string",
                    "firstName": "string",
                    "lastName": "string",
                    "middleName": "string",
                    "photoUrl": "string",
                    "birthDate": "2026-03-07",
                    "clinicRole": "string",
                    "specialization": "string",
                    "alias": "string",
                    "roleAlias": "string"
                  },
                  "updatedByUser": {
                    "id": "string",
                    "tenantId": "string",
                    "userName": "string",
                    "email": "string",
                    "firstName": "string",
                    "lastName": "string",
                    "middleName": "string",
                    "photoUrl": "string",
                    "birthDate": "2026-03-07",
                    "clinicRole": "string",
                    "specialization": "string",
                    "alias": "string",
                    "roleAlias": "string"
                  },
                  "tenantId": "string",
                  "availableSeconds": 0
                },
                "createdAt": "2026-03-07T19:42:15.928Z",
                "createdById": "string",
                "updatedAt": "2026-03-07T19:42:15.928Z",
                "updatedById": "string",
                "deletedAt": "2026-03-07T19:42:15.928Z",
                "deletedById": "string"
              },
              "consultationId": "string",
              "tempAudioPath": "string",
              "externalId": "string",
              "link": "string",
              "durationSeconds": 0,
              "transcription": "string"
            }
          ]
        },
        "secondsUsed": 0,
        "balanceBefore": 0,
        "balanceAfter": 0
      }
    ]
  }
}