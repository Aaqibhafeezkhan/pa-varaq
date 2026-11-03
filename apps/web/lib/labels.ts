import type { BookCondition, CopyStatus, LoanState } from "@varaq/shared";

export const CONDITION_LABEL: Record<BookCondition, string> = {
  MINT: "نو و بی‌نقص",
  GOOD: "خوب",
  FAIR: "متوسط",
  WORN: "کهنه",
};
export const CONDITION_HINT: Record<BookCondition, string> = {
  MINT: "مثل روز اول",
  GOOD: "کمی استفاده‌شده",
  FAIR: "نشانه‌های استفاده",
  WORN: "پاره یا فرسوده",
};
export const COPY_STATUS_LABEL: Record<CopyStatus, string> = {
  AVAILABLE: "آماده امانت",
  LOANED_INTERNAL: "امانت داده شده",
  LOANED_EXTERNAL: "نزد دوست (بیرون از پاورق)",
  UNAVAILABLE: "غیرفعال",
};
export const LOAN_STATE_LABEL: Record<LoanState, string> = {
  REQUESTED: "در انتظار تایید",
  APPROVED: "تایید شد؛ منتظر تحویل",
  ACTIVE: "در حال امانت",
  RETURNED: "برگردانده شد",
  OVERDUE: "دیرکرد",
  CANCELLED: "لغو شد",
};

/** Maps stable API error codes to natural Persian messages. */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "لطفاً دوباره وارد شوید.",
  VALIDATION_ERROR: "اطلاعات واردشده درست نیست.",
  TOO_MANY_ATTEMPTS: "تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.",
  OTP_EXPIRED: "کد منقضی شده است؛ دوباره کد بگیر.",
  INVALID_OTP: "کد واردشده درست یا معتبر نیست.",
  USERNAME_TAKEN: "این نام کاربری قبلاً گرفته شده است.",
  INVITE_REQUIRED: "برای ثبت‌نام به کد دعوت نیاز دارید.",
  INVALID_INVITE_CODE: "کد دعوت معتبر نیست.",
  CIRCLE_IS_PRIVATE: "این حلقه خصوصی است؛ کد دعوت لازم است.",
  CIRCLE_NOT_FOUND: "حلقه پیدا نشد.",
  BOOK_NOT_FOUND:
    "بارکد خوانده شد ولی این کتاب در پایگاه‌های اطلاعاتی پیدا نشد (کتاب‌های فارسی کمتر ثبت شده‌اند). اطلاعاتش را دستی وارد کن؛ شابک پر شده است.",
  COPY_NOT_FOUND: "این کتاب پیدا نشد.",
  NOT_COPY_OWNER: "این کتاب مال شما نیست.",
  COPY_IS_LOANED: "تا وقتی کتاب امانت است نمی‌شود این کار را کرد.",
  COPY_HAS_HISTORY: "این کتاب تاریخچه امانت دارد؛ به‌جای حذف، غیرفعالش کنید.",
  COPY_NOT_AVAILABLE: "این کتاب فعلاً آماده امانت نیست.",
  COPY_ALREADY_RESERVED: "این کتاب برای نفر دیگری رزرو شده است.",
  CANNOT_BORROW_OWN_BOOK: "کتاب خودتان را نمی‌توانید امانت بگیرید.",
  NO_TOKENS: "اعتبار امانت کافی ندارید. با امانت دادن کتاب اعتبار بگیرید.",
  USER_RESTRICTED: "حساب شما فعلاً محدود شده است.",
  NOT_IN_SHARED_CIRCLE: "شما و صاحب کتاب در هیچ حلقه مشترکی نیستید.",
  ALREADY_REQUESTED: "قبلاً برای این کتاب درخواست داده‌اید.",
  DUE_DATE_IN_PAST: "تاریخ برگشت باید در آینده باشد.",
  WRONG_PIN: "کد وارد‌شده درست نیست.",
  PIN_LOCKED: "بیش از حد اشتباه وارد شد؛ امانت را لغو و دوباره شروع کنید.",
  INVALID_LOAN_STATE: "وضعیت این امانت تغییر کرده است؛ صفحه را تازه کنید.",
  ACTION_NOT_ALLOWED_FOR_ROLE: "این کار از دست شما برنمی‌آید.",
  NOT_A_PARTICIPANT: "این امانت مربوط به شما نیست.",
  ENTRY_ALREADY_EXISTS: "برای این امانت قبلاً یادداشت گذاشته‌اید.",
  LOAN_NOT_RETURNED: "بعد از برگشت کتاب می‌توانید یادداشت بگذارید.",
  NOT_THE_BORROWER: "فقط امانت‌گیرنده می‌تواند یادداشت بگذارد.",
  NATIONAL_ID_TAKEN: "با این کد ملی قبلاً حساب ساخته شده است.",
  ACCOUNT_EXISTS: "برای این شماره قبلاً حساب ساخته شده است.",
  NO_BOOKS_AVAILABLE: "فعلاً کتابی آماده امانت نیست.",
  IDENTITY_REQUIRED: "برای امانت گرفتن، کد ملی و تاریخ تولد لازم است.",
  NETWORK: "ارتباط با سرور برقرار نشد.",
};
export const errorMessage = (code?: string) => (code && ERROR_MESSAGES[code]) || "مشکلی پیش آمد؛ دوباره امتحان کنید.";
