import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  compact?: boolean
  loading?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar',
  compact = false,
  loading = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const date = value ? new Date(value + 'T00:00:00') : undefined
  const isValidDate = date instanceof Date && !isNaN(date.getTime())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={loading}
          className={cn(
            'w-full justify-start text-left font-normal',
            compact ? 'h-9 px-2 text-xs' : 'h-10',
            !isValidDate && 'text-muted-foreground',
          )}
        >
          {loading ? (
            <Loader2
              className={cn('shrink-0 animate-spin', compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2')}
            />
          ) : (
            <CalendarIcon className={cn('shrink-0', compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2')} />
          )}
          {isValidDate ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(d.toISOString().split('T')[0])
              setOpen(false)
            }
          }}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
