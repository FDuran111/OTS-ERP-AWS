-- =====================================
-- FOREIGN KEY CONSTRAINTS
-- Run this after all tables are created
-- =====================================

BEGIN;

-- AssetAssignment
ALTER TABLE public."AssetAssignment" 
  ADD CONSTRAINT AssetAssignment_assetId_fkey 
  FOREIGN KEY ("assetId") REFERENCES "CompanyAsset" (id) ON DELETE CASCADE;

ALTER TABLE public."AssetAssignment" 
  ADD CONSTRAINT AssetAssignment_userId_fkey 
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

-- AssetMaintenance
ALTER TABLE public."AssetMaintenance"
  ADD CONSTRAINT AssetMaintenance_assetId_fkey
  FOREIGN KEY ("assetId") REFERENCES "CompanyAsset" (id) ON DELETE CASCADE;

ALTER TABLE public."AssetMaintenance"
  ADD CONSTRAINT AssetMaintenance_performedBy_fkey
  FOREIGN KEY ("performedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- CompanyAsset
ALTER TABLE public."CompanyAsset"
  ADD CONSTRAINT CompanyAsset_purchaseOrderId_fkey
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" (id) ON DELETE SET NULL;

-- ChangeOrder
ALTER TABLE public."ChangeOrder"
  ADD CONSTRAINT ChangeOrder_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."ChangeOrder"
  ADD CONSTRAINT ChangeOrder_requestedBy_fkey
  FOREIGN KEY ("requestedBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."ChangeOrder"
  ADD CONSTRAINT ChangeOrder_approvedBy_fkey
  FOREIGN KEY ("approvedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- Customer
ALTER TABLE public."Customer"
  ADD CONSTRAINT Customer_leadId_fkey
  FOREIGN KEY ("leadId") REFERENCES "Lead" (id) ON DELETE SET NULL;

-- Equipment
ALTER TABLE public."Equipment"
  ADD CONSTRAINT Equipment_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

-- FileAttachment
ALTER TABLE public."FileAttachment"
  ADD CONSTRAINT FileAttachment_uploadedBy_fkey
  FOREIGN KEY ("uploadedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- InventoryItem
ALTER TABLE public."InventoryItem"
  ADD CONSTRAINT InventoryItem_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."InventoryItem"
  ADD CONSTRAINT InventoryItem_storageLocationId_fkey
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" (id) ON DELETE SET NULL;

-- InventoryTransaction
ALTER TABLE public."InventoryTransaction"
  ADD CONSTRAINT InventoryTransaction_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."InventoryTransaction"
  ADD CONSTRAINT InventoryTransaction_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE SET NULL;

ALTER TABLE public."InventoryTransaction"
  ADD CONSTRAINT InventoryTransaction_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."InventoryTransaction"
  ADD CONSTRAINT InventoryTransaction_storageLocationId_fkey
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" (id) ON DELETE SET NULL;

-- Invoice
ALTER TABLE public."Invoice"
  ADD CONSTRAINT Invoice_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."Invoice"
  ADD CONSTRAINT Invoice_customerId_fkey
  FOREIGN KEY ("customerId") REFERENCES "Customer" (id) ON DELETE CASCADE;

ALTER TABLE public."Invoice"
  ADD CONSTRAINT Invoice_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- InvoiceItem
ALTER TABLE public."InvoiceItem"
  ADD CONSTRAINT InvoiceItem_invoiceId_fkey
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice" (id) ON DELETE CASCADE;

ALTER TABLE public."InvoiceItem"
  ADD CONSTRAINT InvoiceItem_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE SET NULL;

-- InvoicePayment
ALTER TABLE public."InvoicePayment"
  ADD CONSTRAINT InvoicePayment_invoiceId_fkey
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice" (id) ON DELETE CASCADE;

ALTER TABLE public."InvoicePayment"
  ADD CONSTRAINT InvoicePayment_processedBy_fkey
  FOREIGN KEY ("processedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- Job
ALTER TABLE public."Job"
  ADD CONSTRAINT Job_customerId_fkey
  FOREIGN KEY ("customerId") REFERENCES "Customer" (id) ON DELETE CASCADE;

ALTER TABLE public."Job"
  ADD CONSTRAINT Job_leadId_fkey
  FOREIGN KEY ("leadId") REFERENCES "Lead" (id) ON DELETE SET NULL;

ALTER TABLE public."Job"
  ADD CONSTRAINT Job_categoryId_fkey
  FOREIGN KEY ("categoryId") REFERENCES "JobCategory" (id) ON DELETE SET NULL;

ALTER TABLE public."Job"
  ADD CONSTRAINT Job_subCategoryId_fkey
  FOREIGN KEY ("subCategoryId") REFERENCES "JobSubCategory" (id) ON DELETE SET NULL;

-- JobAssignment
ALTER TABLE public."JobAssignment"
  ADD CONSTRAINT JobAssignment_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobAssignment"
  ADD CONSTRAINT JobAssignment_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

-- JobAttachment
ALTER TABLE public."JobAttachment"
  ADD CONSTRAINT JobAttachment_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobAttachment"
  ADD CONSTRAINT JobAttachment_fileId_fkey
  FOREIGN KEY ("fileId") REFERENCES "FileAttachment" (id) ON DELETE CASCADE;

ALTER TABLE public."JobAttachment"
  ADD CONSTRAINT JobAttachment_takenBy_fkey
  FOREIGN KEY ("takenBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- JobSubCategory
ALTER TABLE public."JobSubCategory"
  ADD CONSTRAINT JobSubCategory_categoryId_fkey
  FOREIGN KEY ("categoryId") REFERENCES "JobCategory" (id) ON DELETE CASCADE;

-- JobCost
ALTER TABLE public."JobCost"
  ADD CONSTRAINT JobCost_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobCost"
  ADD CONSTRAINT JobCost_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE SET NULL;

ALTER TABLE public."JobCost"
  ADD CONSTRAINT JobCost_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE SET NULL;

ALTER TABLE public."JobCost"
  ADD CONSTRAINT JobCost_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."JobCost"
  ADD CONSTRAINT JobCost_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- JobEquipment
ALTER TABLE public."JobEquipment"
  ADD CONSTRAINT JobEquipment_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobEquipment"
  ADD CONSTRAINT JobEquipment_assignedTo_fkey
  FOREIGN KEY ("assignedTo") REFERENCES "User" (id) ON DELETE SET NULL;

-- JobMaterial
ALTER TABLE public."JobMaterial"
  ADD CONSTRAINT JobMaterial_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobMaterial"
  ADD CONSTRAINT JobMaterial_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."JobMaterial"
  ADD CONSTRAINT JobMaterial_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE SET NULL;

-- JobNote
ALTER TABLE public."JobNote"
  ADD CONSTRAINT JobNote_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobNote"
  ADD CONSTRAINT JobNote_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE CASCADE;

-- JobPhaseAssignment
ALTER TABLE public."JobPhaseAssignment"
  ADD CONSTRAINT JobPhaseAssignment_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE CASCADE;

ALTER TABLE public."JobPhaseAssignment"
  ADD CONSTRAINT JobPhaseAssignment_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

ALTER TABLE public."JobPhaseAssignment"
  ADD CONSTRAINT JobPhaseAssignment_assignedBy_fkey
  FOREIGN KEY ("assignedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- JobPhaseDetail
ALTER TABLE public."JobPhaseDetail"
  ADD CONSTRAINT JobPhaseDetail_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobPhaseDetail"
  ADD CONSTRAINT JobPhaseDetail_phaseTemplateId_fkey
  FOREIGN KEY ("phaseTemplateId") REFERENCES "PhaseTemplate" (id) ON DELETE SET NULL;

ALTER TABLE public."JobPhaseDetail"
  ADD CONSTRAINT JobPhaseDetail_parentPhaseId_fkey
  FOREIGN KEY ("parentPhaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE CASCADE;

-- JobProductionTracking
ALTER TABLE public."JobProductionTracking"
  ADD CONSTRAINT JobProductionTracking_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobProductionTracking"
  ADD CONSTRAINT JobProductionTracking_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE SET NULL;

ALTER TABLE public."JobProductionTracking"
  ADD CONSTRAINT JobProductionTracking_recordedBy_fkey
  FOREIGN KEY ("recordedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- JobScopeOfWork
ALTER TABLE public."JobScopeOfWork"
  ADD CONSTRAINT JobScopeOfWork_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."JobScopeOfWork"
  ADD CONSTRAINT JobScopeOfWork_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON DELETE SET NULL;

ALTER TABLE public."JobScopeOfWork"
  ADD CONSTRAINT JobScopeOfWork_assignedTo_fkey
  FOREIGN KEY ("assignedTo") REFERENCES "User" (id) ON DELETE SET NULL;

-- LaborRate
ALTER TABLE public."LaborRate"
  ADD CONSTRAINT LaborRate_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

-- Lead
ALTER TABLE public."Lead"
  ADD CONSTRAINT Lead_convertedCustomerId_fkey
  FOREIGN KEY ("convertedCustomerId") REFERENCES "Customer" (id) ON DELETE SET NULL;

ALTER TABLE public."Lead"
  ADD CONSTRAINT Lead_convertedJobId_fkey
  FOREIGN KEY ("convertedJobId") REFERENCES "Job" (id) ON DELETE SET NULL;

ALTER TABLE public."Lead"
  ADD CONSTRAINT Lead_assignedTo_fkey
  FOREIGN KEY ("assignedTo") REFERENCES "User" (id) ON DELETE SET NULL;

-- LeadActivity
ALTER TABLE public."LeadActivity"
  ADD CONSTRAINT LeadActivity_leadId_fkey
  FOREIGN KEY ("leadId") REFERENCES "Lead" (id) ON DELETE CASCADE;

ALTER TABLE public."LeadActivity"
  ADD CONSTRAINT LeadActivity_performedBy_fkey
  FOREIGN KEY ("performedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- LeadAttachment
ALTER TABLE public."LeadAttachment"
  ADD CONSTRAINT LeadAttachment_leadId_fkey
  FOREIGN KEY ("leadId") REFERENCES "Lead" (id) ON DELETE CASCADE;

ALTER TABLE public."LeadAttachment"
  ADD CONSTRAINT LeadAttachment_fileId_fkey
  FOREIGN KEY ("fileId") REFERENCES "FileAttachment" (id) ON DELETE CASCADE;

ALTER TABLE public."LeadAttachment"
  ADD CONSTRAINT LeadAttachment_takenBy_fkey
  FOREIGN KEY ("takenBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- Material
ALTER TABLE public."Material"
  ADD CONSTRAINT Material_preferredVendorId_fkey
  FOREIGN KEY ("preferredVendorId") REFERENCES "Vendor" (id) ON DELETE SET NULL;

-- MaterialReservation
ALTER TABLE public."MaterialReservation"
  ADD CONSTRAINT MaterialReservation_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."MaterialReservation"
  ADD CONSTRAINT MaterialReservation_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."MaterialReservation"
  ADD CONSTRAINT MaterialReservation_reservedBy_fkey
  FOREIGN KEY ("reservedBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."MaterialReservation"
  ADD CONSTRAINT MaterialReservation_storageLocationId_fkey
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" (id) ON DELETE SET NULL;

-- MaterialStock
ALTER TABLE public."MaterialStock"
  ADD CONSTRAINT MaterialStock_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."MaterialStock"
  ADD CONSTRAINT MaterialStock_storageLocationId_fkey
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" (id) ON DELETE SET NULL;

ALTER TABLE public."MaterialStock"
  ADD CONSTRAINT MaterialStock_lastUpdatedBy_fkey
  FOREIGN KEY ("lastUpdatedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- Notification
ALTER TABLE public."Notification"
  ADD CONSTRAINT Notification_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

-- PhaseTemplate
ALTER TABLE public."PhaseTemplate"
  ADD CONSTRAINT PhaseTemplate_categoryId_fkey
  FOREIGN KEY ("categoryId") REFERENCES "JobCategory" (id) ON DELETE SET NULL;

ALTER TABLE public."PhaseTemplate"
  ADD CONSTRAINT PhaseTemplate_parentPhaseId_fkey
  FOREIGN KEY ("parentPhaseId") REFERENCES "PhaseTemplate" (id) ON DELETE SET NULL;

-- PurchaseOrder
ALTER TABLE public."PurchaseOrder"
  ADD CONSTRAINT PurchaseOrder_vendorId_fkey
  FOREIGN KEY ("vendorId") REFERENCES "Vendor" (id) ON DELETE RESTRICT;

ALTER TABLE public."PurchaseOrder"
  ADD CONSTRAINT PurchaseOrder_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE SET NULL;

ALTER TABLE public."PurchaseOrder"
  ADD CONSTRAINT PurchaseOrder_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."PurchaseOrder"
  ADD CONSTRAINT PurchaseOrder_approvedBy_fkey
  FOREIGN KEY ("approvedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- PurchaseOrderItem
ALTER TABLE public."PurchaseOrderItem"
  ADD CONSTRAINT PurchaseOrderItem_purchaseOrderId_fkey
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" (id) ON DELETE CASCADE;

ALTER TABLE public."PurchaseOrderItem"
  ADD CONSTRAINT PurchaseOrderItem_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE CASCADE;

ALTER TABLE public."PurchaseOrderItem"
  ADD CONSTRAINT PurchaseOrderItem_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE SET NULL;

-- Route
ALTER TABLE public."Route"
  ADD CONSTRAINT Route_vehicleId_fkey
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" (id) ON DELETE SET NULL;

ALTER TABLE public."Route"
  ADD CONSTRAINT Route_driverId_fkey
  FOREIGN KEY ("driverId") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."Route"
  ADD CONSTRAINT Route_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- RouteStop
ALTER TABLE public."RouteStop"
  ADD CONSTRAINT RouteStop_routeId_fkey
  FOREIGN KEY ("routeId") REFERENCES "Route" (id) ON DELETE CASCADE;

ALTER TABLE public."RouteStop"
  ADD CONSTRAINT RouteStop_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE SET NULL;

ALTER TABLE public."RouteStop"
  ADD CONSTRAINT RouteStop_completedBy_fkey
  FOREIGN KEY ("completedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- Schedule
ALTER TABLE public."Schedule"
  ADD CONSTRAINT Schedule_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

ALTER TABLE public."Schedule"
  ADD CONSTRAINT Schedule_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE CASCADE;

ALTER TABLE public."Schedule"
  ADD CONSTRAINT Schedule_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- ScheduleReminder
ALTER TABLE public."ScheduleReminder"
  ADD CONSTRAINT ScheduleReminder_scheduleId_fkey
  FOREIGN KEY ("scheduleId") REFERENCES "Schedule" (id) ON DELETE CASCADE;

-- ServiceCall
ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_customerId_fkey
  FOREIGN KEY ("customerId") REFERENCES "Customer" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON DELETE SET NULL;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_assignedTechnicianId_fkey
  FOREIGN KEY ("assignedTechnicianId") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_dispatchedBy_fkey
  FOREIGN KEY ("dispatchedBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_createdBy_fkey
  FOREIGN KEY ("createdBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_cancelledBy_fkey
  FOREIGN KEY ("cancelledBy") REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."ServiceCall"
  ADD CONSTRAINT ServiceCall_originalServiceId_fkey
  FOREIGN KEY ("originalServiceId") REFERENCES "ServiceCall" (id) ON DELETE SET NULL;

-- ServiceCallAttachment
ALTER TABLE public."ServiceCallAttachment"
  ADD CONSTRAINT ServiceCallAttachment_serviceCallId_fkey
  FOREIGN KEY ("serviceCallId") REFERENCES "ServiceCall" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCallAttachment"
  ADD CONSTRAINT ServiceCallAttachment_fileId_fkey
  FOREIGN KEY ("fileId") REFERENCES "FileAttachment" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCallAttachment"
  ADD CONSTRAINT ServiceCallAttachment_takenBy_fkey
  FOREIGN KEY ("takenBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- ServiceCallChecklist
ALTER TABLE public."ServiceCallChecklist"
  ADD CONSTRAINT ServiceCallChecklist_serviceCallId_fkey
  FOREIGN KEY ("serviceCallId") REFERENCES "ServiceCall" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCallChecklist"
  ADD CONSTRAINT ServiceCallChecklist_completedBy_fkey
  FOREIGN KEY ("completedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- ServiceCallHistory
ALTER TABLE public."ServiceCallHistory"
  ADD CONSTRAINT ServiceCallHistory_serviceCallId_fkey
  FOREIGN KEY ("serviceCallId") REFERENCES "ServiceCall" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCallHistory"
  ADD CONSTRAINT ServiceCallHistory_changedBy_fkey
  FOREIGN KEY ("changedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- ServiceCallMaterial
ALTER TABLE public."ServiceCallMaterial"
  ADD CONSTRAINT ServiceCallMaterial_serviceCallId_fkey
  FOREIGN KEY ("serviceCallId") REFERENCES "ServiceCall" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceCallMaterial"
  ADD CONSTRAINT ServiceCallMaterial_materialId_fkey
  FOREIGN KEY ("materialId") REFERENCES "Material" (id) ON DELETE RESTRICT;

ALTER TABLE public."ServiceCallMaterial"
  ADD CONSTRAINT ServiceCallMaterial_recordedBy_fkey
  FOREIGN KEY ("recordedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- ServiceSchedule
ALTER TABLE public."ServiceSchedule"
  ADD CONSTRAINT ServiceSchedule_customerId_fkey
  FOREIGN KEY ("customerId") REFERENCES "Customer" (id) ON DELETE CASCADE;

ALTER TABLE public."ServiceSchedule"
  ADD CONSTRAINT ServiceSchedule_templateId_fkey
  FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate" (id) ON DELETE SET NULL;

-- ServiceType
ALTER TABLE public."ServiceType"
  ADD CONSTRAINT ServiceType_categoryId_fkey
  FOREIGN KEY ("categoryId") REFERENCES "JobCategory" (id);

ALTER TABLE public."ServiceType"
  ADD CONSTRAINT ServiceType_subCategoryId_fkey
  FOREIGN KEY ("subCategoryId") REFERENCES "JobSubCategory" (id);

-- TimeEntry
ALTER TABLE public."TimeEntry"
  ADD CONSTRAINT TimeEntry_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public."TimeEntry"
  ADD CONSTRAINT TimeEntry_jobId_fkey
  FOREIGN KEY ("jobId") REFERENCES "Job" (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public."TimeEntry"
  ADD CONSTRAINT TimeEntry_phaseId_fkey
  FOREIGN KEY ("phaseId") REFERENCES "JobPhaseDetail" (id) ON UPDATE CASCADE ON DELETE SET NULL;

-- UserAppearanceSettings
ALTER TABLE public."UserAppearanceSettings"
  ADD CONSTRAINT UserAppearanceSettings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "User" (id) ON DELETE CASCADE;

-- UserAuditLog
ALTER TABLE public."UserAuditLog"
  ADD CONSTRAINT UserAuditLog_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "User" (id) ON DELETE SET NULL;

ALTER TABLE public."UserAuditLog"
  ADD CONSTRAINT UserAuditLog_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES "User" (id) ON DELETE SET NULL;

-- UserNotificationSettings
ALTER TABLE public."UserNotificationSettings"
  ADD CONSTRAINT UserNotificationSettings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "User" (id) ON DELETE CASCADE;

-- UserPermissions
ALTER TABLE public."UserPermissions"
  ADD CONSTRAINT UserPermissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "User" (id) ON DELETE CASCADE;

ALTER TABLE public."UserPermissions"
  ADD CONSTRAINT UserPermissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES "User" (id);

-- UserSecuritySettings
ALTER TABLE public."UserSecuritySettings"
  ADD CONSTRAINT UserSecuritySettings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "User" (id) ON DELETE CASCADE;

-- UserSession
ALTER TABLE public."UserSession"
  ADD CONSTRAINT UserSession_userId_fkey
  FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

COMMIT;