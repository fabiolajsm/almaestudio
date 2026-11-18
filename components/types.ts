import type {
  AppointmentService,
  AppointmentServiceCategoryDefinition,
} from "@/app/types";

export type ActionCardItem = {
  number: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

export type ActionCardProps = {
  card: ActionCardItem;
  index: number;
};

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClassName?: string;
  isShowCancelBtn?: boolean;
};

export type LoadingProps = {
  label: string;
  inline?: boolean;
  className?: string;
};

export type ServicesProps = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;
  hasToShowCount?: boolean;
};

export type SiteHeaderProps = {
  showNavigation?: boolean;
  isFixed?: boolean;
};
