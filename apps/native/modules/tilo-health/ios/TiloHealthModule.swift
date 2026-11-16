import ExpoModulesCore
import HealthKit

/// Apple Health, read only (dependency policy rule 1: HealthKit, no third-party library). Exactly what
/// the app reads and nothing more (data minimisation): sleep analysis, step count, walking workouts.
/// Raw samples go to JS, where the shared rules (bands, merging, what counts) live.
public class TiloHealthModule: Module {
  private let store = HKHealthStore()

  private var readTypes: Set<HKObjectType> {
    var s = Set<HKObjectType>()
    if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { s.insert(sleep) }
    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { s.insert(steps) }
    s.insert(HKObjectType.workoutType())
    return s
  }

  private func range(_ startMs: Double, _ endMs: Double) -> NSPredicate {
    HKQuery.predicateForSamples(withStart: Date(timeIntervalSince1970: startMs / 1000), end: Date(timeIntervalSince1970: endMs / 1000), options: [])
  }

  private func ms(_ d: Date) -> Double { d.timeIntervalSince1970 * 1000 }

  private func samples(_ type: HKSampleType, _ predicate: NSPredicate) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { cont in
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
      let q = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, results, error in
        if let error = error { cont.resume(throwing: error) } else { cont.resume(returning: results ?? []) }
      }
      self.store.execute(q)
    }
  }

  public func definition() -> ModuleDefinition {
    Name("TiloHealth")

    Function("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    /// Shows iOS's own permission sheet for the three read types (nothing is ever written).
    /// Resolves once the sheet is dealt with; iOS never says which types were refused.
    AsyncFunction("requestAuthorization") { () async throws -> Bool in
      try await self.store.requestAuthorization(toShare: [], read: self.readTypes)
      return true
    }

    /// Sleep analysis samples overlapping the range: [{ start, end, value }] in ms, value as Apple's
    /// HKCategoryValueSleepAnalysis raw value (0 in bed, 1 asleep unspecified, 2 awake, 3 core, 4 deep, 5 REM).
    AsyncFunction("sleepSamples") { (startMs: Double, endMs: Double) async throws -> [[String: Double]] in
      guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return [] }
      let rows = try await self.samples(type, self.range(startMs, endMs))
      return rows.compactMap { s in
        guard let c = s as? HKCategorySample else { return nil }
        return ["start": self.ms(c.startDate), "end": self.ms(c.endDate), "value": Double(c.value)]
      }
    }

    /// The step count over the range, as HealthKit's own de-duplicated sum across watch and phone;
    /// null when there's none.
    AsyncFunction("stepSum") { (startMs: Double, endMs: Double) async throws -> Double? in
      guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else { return nil }
      return try await withCheckedThrowingContinuation { cont in
        let q = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: self.range(startMs, endMs), options: .cumulativeSum) { _, stats, error in
          if let e = error as? HKError, e.code == .errorNoData { cont.resume(returning: nil); return }
          if let error = error { cont.resume(throwing: error); return }
          cont.resume(returning: stats?.sumQuantity()?.doubleValue(for: .count()))
        }
        self.store.execute(q)
      }
    }

    /// Walking workouts starting in the range: [{ start, end }] in ms.
    AsyncFunction("walkingWorkouts") { (startMs: Double, endMs: Double) async throws -> [[String: Double]] in
      let p = NSCompoundPredicate(andPredicateWithSubpredicates: [self.range(startMs, endMs), HKQuery.predicateForWorkouts(with: .walking)])
      let rows = try await self.samples(HKObjectType.workoutType(), p)
      return rows.map { ["start": self.ms($0.startDate), "end": self.ms($0.endDate)] }
    }
  }
}
