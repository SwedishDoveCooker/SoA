use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub enum Score {
    SuperBigCupUp,
    SuperBigCup,
    SuperBigCupDown,

    BigCupUp,
    BigCup,
    BigCupDown,

    MedCupUp,
    MedCup,
    MedCupDown,

    HardToSay,
    SuperSmallCup,
}
