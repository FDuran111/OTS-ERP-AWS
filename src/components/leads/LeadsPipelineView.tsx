'use client'

import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
  Grid,
} from '@mui/material'
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Lead {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  email?: string
  phone?: string
  status: string
  source?: string
  estimatedValue?: number
  priority?: string
  description?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  daysSinceLastContact?: number
  overdue?: boolean
  activities?: any[]
  estimates?: any[]
}

interface LeadsPipelineViewProps {
  leads: Lead[]
  onEditLead: (lead: Lead) => void
  onDeleteLead: (lead: Lead) => void
  onUpdateLeadStatus: (leadId: string, newStatus: string) => void
}

const leadStages = [
  { key: 'COLD_LEAD', label: 'Cold Leads', color: '#90CAF9' },
  { key: 'WARM_LEAD', label: 'Warm Leads', color: '#FFCC02' },
  { key: 'ESTIMATE_REQUESTED', label: 'Estimate Requested', color: '#FF9800' },
  { key: 'ESTIMATE_SENT', label: 'Estimate Sent', color: '#FF5722' },
  { key: 'ESTIMATE_APPROVED', label: 'Approved', color: '#4CAF50' },
  { key: 'JOB_SCHEDULED', label: 'Job Scheduled', color: '#9C27B0' },
  { key: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required', color: '#FFC107' },
  { key: 'LOST', label: 'Lost', color: '#757575' },
]

// Droppable Stage Column Component
function DroppableStageColumn({ 
  stage, 
  leads, 
  isOver, 
  onMenuClick, 
  menuAnchors, 
  onMenuClose, 
  onEdit, 
  onDelete 
}: {
  stage: { key: string; label: string; color: string }
  leads: Lead[]
  isOver: boolean
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lead: Lead) => void
  menuAnchors: { [key: string]: HTMLElement | null }
  onMenuClose: (leadId: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { setNodeRef } = useDroppable({
    id: stage.key,
    data: {
      type: 'stage',
      stage
    }
  })

  return (
    <SortableContext
      items={leads.map(lead => lead.id)}
      strategy={verticalListSortingStrategy}
    >
      <Box
        sx={{
          minWidth: 280,
          maxWidth: 280,
          backgroundColor: 'black',
          borderRadius: 2,
          p: 1,
          border: '2px solid black',
        }}
      >
        <Paper
          ref={setNodeRef}
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: isOver ? '#e3f2fd' : '#1a2332',
            border: isOver ? '2px solid #1976d2' : '1px solid #2d3748',
            height: '100%',
            transform: isOver ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {/* Stage Header */}
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: stage.color,
                fontSize: '1rem'
              }}
            >
              {stage.label}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip 
                label={leads.length} 
                size="small" 
                sx={{ 
                  backgroundColor: stage.color,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'success.main',
                  fontWeight: 600
                }}
              >
                ${leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {/* Content Area */}
          <Box
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1,
              minHeight: '400px',
              p: 1,
              borderRadius: 1,
              backgroundColor: '#1a2332',
            }}
          >
            {leads.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: '200px',
                border: '2px dashed black',
                borderRadius: 1,
                backgroundColor: '#2d3748'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    textAlign: 'center', 
                    color: isOver ? '#1976d2' : 'text.secondary',
                    fontStyle: 'italic',
                    fontWeight: isOver ? 'bold' : 'normal',
                  }}
                >
                  {isOver ? 'Drop here to move lead' : 'No leads in this stage'}
                </Typography>
              </Box>
            ) : (
              leads.map((lead) => (
                <DraggableLeadCard
                  key={lead.id}
                  lead={lead}
                  stage={stage}
                  onMenuClick={onMenuClick}
                  menuAnchor={menuAnchors[lead.id]}
                  onMenuClose={() => onMenuClose(lead.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </Box>
        </Paper>
      </Box>
    </SortableContext>
  )
}

// Draggable Lead Card Component
function DraggableLeadCard({ 
  lead, 
  stage, 
  onMenuClick, 
  menuAnchor, 
  onMenuClose, 
  onEdit, 
  onDelete 
}: {
  lead: Lead
  stage: { key: string; label: string; color: string }
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lead: Lead) => void
  menuAnchor: HTMLElement | null
  onMenuClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: lead.id,
    data: {
      type: 'lead',
      lead,
      currentStage: stage.key
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH': return 'error'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'TBD'
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: isDragging ? 'none' : 'translateY(-2px)',
          boxShadow: isDragging ? 'none' : 3,
        },
        border: lead.overdue ? '2px solid #f44336' : '2px solid black',
        position: 'relative',
        touchAction: 'none',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Card Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: stage.color, fontSize: '0.8rem' }}>
              {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {lead.companyName || `${lead.firstName} ${lead.lastName}`}
              </Typography>
              {lead.companyName && (
                <Typography variant="caption" color="text.secondary">
                  {lead.firstName} {lead.lastName}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onMenuClick(e, lead)
            }}
            sx={{ p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Contact Info */}
        {(lead.phone || lead.email) && (
          <Box sx={{ mb: 1 }}>
            {lead.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption">{lead.phone}</Typography>
              </Box>
            )}
            {lead.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {lead.email}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Estimated Value */}
        {lead.estimatedValue && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AttachMoney sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="success.main" fontWeight="medium">
              {formatCurrency(lead.estimatedValue)}
            </Typography>
          </Box>
        )}

        {/* Priority & Source */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {lead.priority && (
            <Chip
              label={lead.priority}
              size="small"
              color={getPriorityColor(lead.priority) as any}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
          {lead.source && (
            <Chip
              label={lead.source}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>

        {/* Description */}
        {lead.description && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {lead.description}
          </Typography>
        )}

        {/* Overdue Indicator */}
        {lead.overdue && (
          <Chip
            label="OVERDUE"
            size="small"
            color="error"
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: '0.6rem',
              height: 18
            }}
          />
        )}
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={onMenuClose}
        PaperProps={{
          sx: { minWidth: 140 }
        }}
      >
        <MenuItem onClick={onEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Lead
        </MenuItem>
        <Divider />
        <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Lead
        </MenuItem>
      </Menu>
    </Card>
  )
}


export default function LeadsPipelineView({ 
  leads, 
  onEditLead, 
  onDeleteLead, 
  onUpdateLeadStatus 
}: LeadsPipelineViewProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [cardMenuAnchor, setCardMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({})
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleCardMenuClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation()
    setCardMenuAnchor({ ...cardMenuAnchor, [lead.id]: event.currentTarget })
    setSelectedLead(lead)
  }

  const handleCardMenuClose = (leadId: string) => {
    setCardMenuAnchor({ ...cardMenuAnchor, [leadId]: null })
  }

  const handleEditClick = () => {
    if (selectedLead) {
      onEditLead(selectedLead)
      handleCardMenuClose(selectedLead.id)
    }
  }

  const handleDeleteClick = () => {
    if (selectedLead) {
      onDeleteLead(selectedLead)
      handleCardMenuClose(selectedLead.id)
    }
  }

  const getLeadsForStage = (stageKey: string) => {
    return leads.filter(lead => lead.status === stageKey)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the dragged lead
    const lead = leads.find(l => l.id === active.id)
    setDraggedLead(lead || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setOverId(over ? over.id as string : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedLead(null)
    setOverId(null)
    
    if (!over) return
    
    // Check if we're dropping on a stage
    const targetStageId = over.id as string
    const targetStage = leadStages.find(stage => stage.key === targetStageId)
    
    if (!targetStage) {
      // If not dropping on a stage directly, check if the over element has stage data
      const overData = over.data?.current
      if (overData?.type === 'stage') {
        const stageKey = overData.stage
        const stage = leadStages.find(s => s.key === stageKey)
        if (stage) {
          const leadId = active.id as string
          const lead = leads.find(l => l.id === leadId)
          
          if (lead && lead.status !== stage.key) {
            onUpdateLeadStatus(leadId, stage.key)
          }
        }
      }
      return
    }
    
    const leadId = active.id as string
    const lead = leads.find(l => l.id === leadId)
    
    if (lead && lead.status !== targetStage.key) {
      onUpdateLeadStatus(leadId, targetStage.key)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {isMobile ? (
        // Mobile: Vertical layout with accordions
        <Box sx={{ p: 1 }}>
          {leadStages.map((stage) => {
            const stageLeads = getLeadsForStage(stage.key)
            
            return (
              <Paper 
                key={stage.key}
                sx={{ 
                  mb: 2, 
                  p: 2,
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 2
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: stage.color,
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {stage.label}
                  </Typography>
                  <Chip 
                    label={stageLeads.length} 
                    size="small"
                    sx={{ 
                      bgcolor: `${stage.color}20`,
                      color: stage.color
                    }}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  {stageLeads.map((lead) => (
                    <Grid key={lead.id} size={{ xs: 12 }}>
                      <Card sx={{ 
                        border: 1,
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: stage.color,
                          boxShadow: 2
                        }
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Avatar 
                              sx={{ 
                                width: 40, 
                                height: 40, 
                                bgcolor: stage.color,
                                fontSize: '0.875rem'
                              }}
                            >
                              {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  mb: 0.5,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {lead.companyName || `${lead.firstName} ${lead.lastName}`}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  display: 'block',
                                  fontSize: '0.75rem',
                                  mb: 1,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {lead.email}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                <Chip
                                  label={lead.source}
                                  size="small"
                                  sx={{ 
                                    fontSize: '0.7rem',
                                    height: 24
                                  }}
                                />
                                {lead.estimatedValue && (
                                  <Chip
                                    label={`$${lead.estimatedValue.toLocaleString()}`}
                                    size="small"
                                    color="success"
                                    sx={{ 
                                      fontSize: '0.7rem',
                                      height: 24
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleCardMenuClick(e, lead)}
                              sx={{ p: 0.5 }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )
          })}
        </Box>
      ) : (
        // Desktop: Horizontal pipeline layout
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          overflowX: 'auto', 
          minHeight: '70vh', 
          p: 1
        }}>
          {leadStages.map((stage) => {
            const stageLeads = getLeadsForStage(stage.key)
            const isOver = overId === stage.key
            const isDragging = Boolean(activeId)
            
            return (
              <DroppableStageColumn
                key={stage.key}
                stage={stage}
                leads={stageLeads}
                isOver={isOver}
                onMenuClick={handleCardMenuClick}
                menuAnchors={cardMenuAnchor}
                onMenuClose={handleCardMenuClose}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            )
          })}
        </Box>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedLead ? (
          <Card sx={{ 
            width: 280, 
            opacity: 0.8,
            transform: 'rotate(5deg)',
            boxShadow: 4
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#666', fontSize: '0.8rem' }}>
                  {draggedLead.firstName.charAt(0)}{draggedLead.lastName.charAt(0)}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {draggedLead.companyName || `${draggedLead.firstName} ${draggedLead.lastName}`}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}